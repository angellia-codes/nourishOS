import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  EMPLOYMENT_STATUSES,
  CONTRACT_TYPES,
  GENDERS,
  type EmploymentStatus,
  type ContractType,
  allocateEmployeeNumber,
  assertContactFieldsUnique,
  calculateProbationEndDate,
  recordEmployeeActivity,
  requireIsoDate,
} from './helpers'

interface CreateEmployeeInput {
  fullName: string
  preferredName?: string
  gender: string
  birthDate: string
  nationalId?: string
  taxNumber?: string
  religion?: string
  phone: string
  email: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  position: string
  departmentId: string
  outletId: string
  managerId?: string
  employmentStatus: EmploymentStatus
  joinDate: string
  probationMonths: number
  contractType: ContractType
  contractStartDate?: string
  contractEndDate?: string
}

export const createEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_CREATE)

    const input = (request.data ?? {}) as Partial<CreateEmployeeInput>

    if (!input.fullName?.trim() || !input.phone?.trim() || !input.email?.trim() || !input.position?.trim()) {
      throw new AppError('invalid-argument', 'fullName, phone, email, and position are required.')
    }
    if (!input.departmentId || !input.outletId) {
      throw new AppError('invalid-argument', 'departmentId and outletId are required.')
    }
    if (!GENDERS.includes(input.gender as (typeof GENDERS)[number])) {
      throw new AppError('invalid-argument', `gender must be one of: ${GENDERS.join(', ')}.`)
    }
    if (!EMPLOYMENT_STATUSES.includes(input.employmentStatus as EmploymentStatus)) {
      throw new AppError('invalid-argument', `employmentStatus must be one of: ${EMPLOYMENT_STATUSES.join(', ')}.`)
    }
    if (!CONTRACT_TYPES.includes(input.contractType as ContractType)) {
      throw new AppError('invalid-argument', `contractType must be one of: ${CONTRACT_TYPES.join(', ')}.`)
    }
    const birthDate = requireIsoDate(input.birthDate, 'birthDate')
    const joinDate = requireIsoDate(input.joinDate, 'joinDate')
    if (typeof input.probationMonths !== 'number' || input.probationMonths < 0) {
      throw new AppError('invalid-argument', 'probationMonths must be a non-negative number.')
    }

    // HR.md §21: Join Date cannot be in the future.
    if (new Date(`${joinDate}T00:00:00Z`).getTime() > Date.now()) {
      throw new AppError('invalid-argument', 'joinDate cannot be in the future.')
    }

    const contractStartDate = input.contractStartDate ? requireIsoDate(input.contractStartDate, 'contractStartDate') : null
    const contractEndDate = input.contractEndDate ? requireIsoDate(input.contractEndDate, 'contractEndDate') : null
    if (input.contractType === 'fixedTerm' && !contractEndDate) {
      throw new AppError('invalid-argument', 'contractEndDate is required for fixed-term contracts.')
    }
    // HR.md §21: contract end must be after its start.
    if (contractStartDate && contractEndDate && contractEndDate <= contractStartDate) {
      throw new AppError('invalid-argument', 'contractEndDate must be later than contractStartDate.')
    }

    // HR.md §21: assigned manager must be an active employee.
    if (input.managerId) {
      const managerSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(input.managerId).get()
      if (!managerSnap.exists || managerSnap.data()?.status !== 'active') {
        throw new AppError('failed-precondition', 'Assigned manager must be an active employee.')
      }
    }

    await assertContactFieldsUnique({ email: input.email.trim(), phone: input.phone.trim() })

    const employeeNumber = await allocateEmployeeNumber(input.employmentStatus as EmploymentStatus)

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc()
    await employeeRef.set({
      employeeNumber,
      fullName: input.fullName.trim(),
      preferredName: input.preferredName?.trim() || null,
      gender: input.gender,
      birthDate,
      nationalId: input.nationalId?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      religion: input.religion?.trim() || null,
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
      position: input.position.trim(),
      departmentId: input.departmentId,
      outletId: input.outletId,
      managerId: input.managerId ?? null,
      employmentStatus: input.employmentStatus,
      joinDate,
      probationMonths: input.probationMonths,
      probationEndDate: calculateProbationEndDate(joinDate, input.probationMonths),
      contractType: input.contractType,
      contractStartDate,
      contractEndDate,
      resignationDate: null,
      resignationReason: null,
      ...newDocumentBaseFields(user.uid, 'active'),
    })

    await recordEmployeeActivity(
      { id: employeeRef.id, departmentId: input.departmentId, outletId: input.outletId },
      'hired',
      `Hired as ${input.position.trim()} (${employeeNumber}).`,
      user,
    )

    await recordAuditEvent({
      eventType: 'EmployeeCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeRef.id,
      action: 'create',
      user,
      newValues: { employeeNumber, fullName: input.fullName.trim(), position: input.position.trim() },
    })

    return successResponse({ employeeId: employeeRef.id, employeeNumber }, 'Employee created.')
  } catch (error) {
    handleError(error)
  }
})
