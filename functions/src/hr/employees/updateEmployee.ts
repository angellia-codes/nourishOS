import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
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
  assertContactFieldsUnique,
  calculateProbationEndDate,
  recordEmployeeActivity,
  requireIsoDate,
} from './helpers'

/**
 * Whitelisted updatable fields. employeeNumber, status, isArchived, and the
 * resignation pair are deliberately excluded — the number is immutable and
 * separation state only changes through archiveEmployee.
 */
const STRING_FIELDS = [
  'fullName',
  'preferredName',
  'nationalId',
  'taxNumber',
  'religion',
  'phone',
  'email',
  'address',
  'emergencyContactName',
  'emergencyContactPhone',
  'position',
  'departmentId',
  'outletId',
  'managerId',
] as const

const DATE_FIELDS = ['birthDate', 'joinDate', 'contractStartDate', 'contractEndDate'] as const

interface UpdateEmployeeInput {
  employeeId: string
  updates: Record<string, unknown>
}

export const updateEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { employeeId, updates } = (request.data ?? {}) as Partial<UpdateEmployeeInput>
    if (!employeeId || !updates || typeof updates !== 'object') {
      throw new AppError('invalid-argument', 'employeeId and updates are required.')
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
    const snap = await employeeRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Employee not found.')
    }
    const existing = snap.data() as Record<string, unknown>

    const changes: Record<string, unknown> = {}

    for (const field of STRING_FIELDS) {
      if (field in updates) {
        const value = updates[field]
        if (value !== null && typeof value !== 'string') {
          throw new AppError('invalid-argument', `${field} must be a string or null.`)
        }
        changes[field] = typeof value === 'string' ? value.trim() || null : null
      }
    }
    for (const field of DATE_FIELDS) {
      if (field in updates) {
        changes[field] = updates[field] === null ? null : requireIsoDate(updates[field], field)
      }
    }
    if ('gender' in updates) {
      if (!GENDERS.includes(updates.gender as (typeof GENDERS)[number])) {
        throw new AppError('invalid-argument', `gender must be one of: ${GENDERS.join(', ')}.`)
      }
      changes.gender = updates.gender
    }
    if ('employmentStatus' in updates) {
      if (!EMPLOYMENT_STATUSES.includes(updates.employmentStatus as EmploymentStatus)) {
        throw new AppError('invalid-argument', `employmentStatus must be one of: ${EMPLOYMENT_STATUSES.join(', ')}.`)
      }
      changes.employmentStatus = updates.employmentStatus
    }
    if ('contractType' in updates) {
      if (!CONTRACT_TYPES.includes(updates.contractType as ContractType)) {
        throw new AppError('invalid-argument', `contractType must be one of: ${CONTRACT_TYPES.join(', ')}.`)
      }
      changes.contractType = updates.contractType
    }
    if ('probationMonths' in updates) {
      if (typeof updates.probationMonths !== 'number' || updates.probationMonths < 0) {
        throw new AppError('invalid-argument', 'probationMonths must be a non-negative number.')
      }
      changes.probationMonths = updates.probationMonths
    }

    if (Object.keys(changes).length === 0) {
      throw new AppError('invalid-argument', 'No updatable fields were provided.')
    }

    // Required core fields may be edited but never blanked.
    for (const field of ['fullName', 'phone', 'email', 'position', 'departmentId', 'outletId'] as const) {
      if (field in changes && !changes[field]) {
        throw new AppError('invalid-argument', `${field} cannot be empty.`)
      }
    }

    const merged = { ...existing, ...changes }

    const joinDate = merged.joinDate as string
    if (new Date(`${joinDate}T00:00:00Z`).getTime() > Date.now()) {
      throw new AppError('invalid-argument', 'joinDate cannot be in the future.')
    }
    if ('joinDate' in changes || 'probationMonths' in changes) {
      changes.probationEndDate = calculateProbationEndDate(joinDate, merged.probationMonths as number)
    }
    if (merged.contractType === 'fixedTerm' && !merged.contractEndDate) {
      throw new AppError('invalid-argument', 'contractEndDate is required for fixed-term contracts.')
    }
    if (
      merged.contractStartDate &&
      merged.contractEndDate &&
      (merged.contractEndDate as string) <= (merged.contractStartDate as string)
    ) {
      throw new AppError('invalid-argument', 'contractEndDate must be later than contractStartDate.')
    }

    if (changes.managerId) {
      if (changes.managerId === employeeId) {
        throw new AppError('invalid-argument', 'An employee cannot be their own manager.')
      }
      const managerSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(changes.managerId as string).get()
      if (!managerSnap.exists || managerSnap.data()?.status !== 'active') {
        throw new AppError('failed-precondition', 'Assigned manager must be an active employee.')
      }
    }

    await assertContactFieldsUnique(
      {
        email: changes.email !== undefined && changes.email !== existing.email ? (changes.email as string) : undefined,
        phone: changes.phone !== undefined && changes.phone !== existing.phone ? (changes.phone as string) : undefined,
      },
      employeeId,
    )

    await employeeRef.update({ ...changes, ...updatedFields(user.uid) })

    const changedFieldNames = Object.keys(changes).filter((key) => key !== 'probationEndDate')
    await recordEmployeeActivity(
      { id: employeeId, departmentId: merged.departmentId as string, outletId: merged.outletId as string },
      'updated',
      `Profile updated: ${changedFieldNames.join(', ')}.`,
      user,
    )

    const previousValues: Record<string, unknown> = {}
    for (const key of Object.keys(changes)) previousValues[key] = existing[key] ?? null

    await recordAuditEvent({
      eventType: 'EmployeeUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeId,
      action: 'update',
      user,
      previousValues,
      newValues: changes,
    })

    return successResponse({ employeeId }, 'Employee updated.')
  } catch (error) {
    handleError(error)
  }
})
