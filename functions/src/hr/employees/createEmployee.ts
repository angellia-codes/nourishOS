import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { POSITION_LABELS, positionsFor } from '../../lib/positions'
import { recordActivityInternal } from '../../shared/activity'
import {
  EMPLOYMENT_STATUSES,
  CONTRACT_TYPES,
  GENDERS,
  DISCIPLINARY_TYPES,
  RELIGIONS,
  TAX_STATUSES,
  type EmploymentStatus,
  type ContractType,
  type DisciplinaryType,
  type Religion,
  type TaxStatus,
  allocateEmployeeNumber,
  assertContactFieldsUnique,
  calculateProbationEndDate,
  recordEmployeeActivity,
  requireIsoDate,
} from './helpers'
import { createContractInternal } from '../contracts/helpers'
import { generateAssignmentsForEmployeeInternal } from '../training'

export interface CreateEmployeeInput {
  fullName: string
  gender: string
  birthDate: string
  nationalId?: string
  taxNumber?: string
  religion?: Religion
  phone: string
  email: string
  address?: string
  permanentAddress?: string
  domicileAddress?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  motherName?: string
  bpjsTk?: string
  bpjsKesehatan?: string
  /** payroll-components-payslip-design.md §4.6 — pre-NourishOS payroll number. */
  legacyEmployeeId?: string
  personalTaxStatus?: TaxStatus
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
  disciplinaryType?: DisciplinaryType
  disciplinaryStartPeriod?: string
  disciplinaryEndPeriod?: string
  recognitionType?: string
  recognitionPeriod?: string
  /**
   * Set when the hire came through the recruitment pipeline — the employee
   * form is opened as /hr/employees/new?candidateId=… from the onboarding
   * checklist. Links the three records together rather than leaving the new
   * employee unconnected to the candidate they were five minutes ago.
   */
  candidateId?: string
}

/**
 * The mutation itself, split out from the callable so importEmployees can
 * call it once per row without a second copy of the validation/write logic —
 * same extraction createCalendarEventInternal set for the calendar module.
 */
export async function createEmployeeInternal(
  user: AuthedUser,
  input: Partial<CreateEmployeeInput>,
): Promise<{ employeeId: string; employeeNumber: string }> {
  if (!input.fullName?.trim() || !input.phone?.trim() || !input.email?.trim() || !input.position?.trim()) {
    throw new AppError('invalid-argument', 'fullName, phone, email, and position are required.')
  }
  if (!input.departmentId || !input.outletId) {
    throw new AppError('invalid-argument', 'departmentId and outletId are required.')
  }
  const departmentsForOutlet = OUTLET_DEPARTMENTS[input.outletId]
  if (!departmentsForOutlet) {
    throw new AppError('invalid-argument', 'Select a valid outlet.')
  }
  if (!departmentsForOutlet.includes(input.departmentId)) {
    throw new AppError('invalid-argument', 'Select a department that exists at this outlet.')
  }
  // POSITIONS.md §3 catalog, scoped per department — closes the gap
  // probationReviewTrigger.ts flags: position must now match the id
  // AppraisalTemplateSeed.positionId keys off, not free text.
  if (!positionsFor(input.outletId, input.departmentId).includes(input.position.trim())) {
    throw new AppError('invalid-argument', 'Select a valid position for this department.')
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

  if (input.disciplinaryType && !DISCIPLINARY_TYPES.includes(input.disciplinaryType)) {
    throw new AppError('invalid-argument', `disciplinaryType must be one of: ${DISCIPLINARY_TYPES.join(', ')}.`)
  }
  if (input.religion && !RELIGIONS.includes(input.religion)) {
    throw new AppError('invalid-argument', `religion must be one of: ${RELIGIONS.join(', ')}.`)
  }
  if (input.personalTaxStatus && !TAX_STATUSES.includes(input.personalTaxStatus)) {
    throw new AppError('invalid-argument', `personalTaxStatus must be one of: ${TAX_STATUSES.join(', ')}.`)
  }
  const disciplinaryStartPeriod = input.disciplinaryStartPeriod
    ? requireIsoDate(input.disciplinaryStartPeriod, 'disciplinaryStartPeriod')
    : null
  const disciplinaryEndPeriod = input.disciplinaryEndPeriod
    ? requireIsoDate(input.disciplinaryEndPeriod, 'disciplinaryEndPeriod')
    : null
  const recognitionPeriod = input.recognitionPeriod ? requireIsoDate(input.recognitionPeriod, 'recognitionPeriod') : null

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
    gender: input.gender,
    birthDate,
    nationalId: input.nationalId?.trim() || null,
    taxNumber: input.taxNumber?.trim() || null,
    religion: input.religion?.trim() || null,
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address?.trim() || null,
    permanentAddress: input.permanentAddress?.trim() || null,
    domicileAddress: input.domicileAddress?.trim() || null,
    emergencyContactName: input.emergencyContactName?.trim() || null,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
    motherName: input.motherName?.trim() || null,
    bpjsTk: input.bpjsTk?.trim() || null,
    bpjsKesehatan: input.bpjsKesehatan?.trim() || null,
    // §4.6 — null for anyone hired since NourishOS; HR backfills legacy staff.
    legacyEmployeeId: input.legacyEmployeeId?.trim() || null,
    personalTaxStatus: input.personalTaxStatus ?? null,
    position: input.position.trim(),
    departmentId: input.departmentId,
    outletId: input.outletId,
    managerId: input.managerId ?? null,
    employmentStatus: input.employmentStatus,
    joinDate,
    probationMonths: input.probationMonths,
    probationEndDate: calculateProbationEndDate(joinDate, input.probationMonths),
    // §12.1: every new hire starts pending — reviewed later on the profile.
    probationStatus: 'pending',
    contractType: input.contractType,
    contractStartDate,
    contractEndDate,
    disciplinaryType: input.disciplinaryType ?? null,
    disciplinaryStartPeriod,
    disciplinaryEndPeriod,
    recognitionType: input.recognitionType?.trim() || null,
    recognitionPeriod,
    resignationDate: null,
    resignationReason: null,
    ...newDocumentBaseFields(user.uid, 'active'),
  })

  // Recruitment link: stamp the new employee id back onto the candidate and
  // its onboarding checklist. Best-effort by design — a bad candidateId must
  // not undo an employee record that is already written.
  if (input.candidateId) {
    const candidateRef = db.collection(COLLECTIONS.CANDIDATES).doc(input.candidateId)
    const candidateSnap = await candidateRef.get()
    if (candidateSnap.exists) {
      await candidateRef.update({ employeeId: employeeRef.id, ...updatedFields(user.uid) })

      const candidate = candidateSnap.data()!
      const checklists = await db
        .collection(COLLECTIONS.ONBOARDING_CHECKLISTS)
        .where('candidateId', '==', input.candidateId)
        .limit(1)
        .get()
      if (!checklists.empty) {
        const checklist = checklists.docs[0]
        // employment-application-form.md §7 AC-5: once the candidate filled in
        // F010 through the portal, checklist item 19 (Application Form) is
        // verified against that record rather than collected again on paper.
        const items = (checklist.data().documentChecklist ?? []) as Record<string, unknown>[]
        const documentChecklist = candidate.applicationForm
          ? items.map((item) =>
              item.itemNumber === 19
                ? {
                    ...item,
                    status: 'received',
                    linkedRecordType: 'candidate',
                    linkedRecordId: input.candidateId,
                    receivedDate: (candidate.submittedAt as string | null)?.slice(0, 10) ?? item.receivedDate ?? null,
                  }
                : item,
            )
          : items
        await checklist.ref.update({ employeeId: employeeRef.id, documentChecklist, ...updatedFields(user.uid) })
      }
    }
  }

  await createContractInternal(
    user,
    { id: employeeRef.id, departmentId: input.departmentId, outletId: input.outletId },
    { contractType: input.contractType as ContractType, contractStartDate: contractStartDate ?? joinDate, contractEndDate },
  )

  const positionLabel = POSITION_LABELS[input.position.trim()] ?? input.position.trim()

  await recordEmployeeActivity(
    { id: employeeRef.id, departmentId: input.departmentId, outletId: input.outletId },
    'hired',
    `Hired as ${positionLabel} (${employeeNumber}).`,
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

  // training-module-spec-v1.0.md §6.1 — the department's onboarding sequence
  // is issued at hire: gate-open topics as `assigned`, the rest `locked`.
  // Never fatal to the hire itself; HR can re-run generateTrainingAssignments.
  try {
    await generateAssignmentsForEmployeeInternal(
      {
        id: employeeRef.id,
        fullName: input.fullName.trim(),
        departmentId: input.departmentId,
        outletId: input.outletId,
        joinDate,
      },
      user,
    )
  } catch (error) {
    logger.error(`Failed to issue training for new employee ${employeeRef.id}`, error)
  }

  await recordActivityInternal({
    eventType: 'EmployeeJoined',
    module: 'hr',
    title: `${input.fullName.trim()} joined as ${positionLabel}`,
    resourceType: 'employee',
    resourceId: employeeRef.id,
    actorUid: user.uid,
    actionUrl: `/hr/employees/${employeeRef.id}`,
  })

  return { employeeId: employeeRef.id, employeeNumber }
}

export const createEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_CREATE)

    const result = await createEmployeeInternal(user, (request.data ?? {}) as Partial<CreateEmployeeInput>)

    return successResponse(result, 'Employee created.')
  } catch (error) {
    handleError(error)
  }
})
