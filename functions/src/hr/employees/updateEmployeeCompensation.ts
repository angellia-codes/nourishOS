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
  type AuthedUser,
} from '../../lib'

export interface CompensationInput {
  basicSalary: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
  bankAccountName?: string
  bankAccountNumber?: string
}

function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new AppError('invalid-argument', `${field} must be a non-negative number.`)
  }
  return value
}

/**
 * The mutation itself, split out (same shape as createEmployeeInternal) so
 * importEmployees.ts can call it per row without a second copy of the
 * validation/write/audit logic. Caller is responsible for the
 * EMPLOYEES_READ_SENSITIVE permission check — this function does not
 * re-check it, matching createEmployeeInternal's own contract.
 */
export async function setEmployeeCompensationInternal(
  user: AuthedUser,
  employeeId: string,
  input: Partial<CompensationInput>,
): Promise<void> {
  const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId)
  const employeeSnap = await employeeRef.get()
  if (!employeeSnap.exists) {
    throw new AppError('not-found', 'Employee not found.')
  }

  const basicSalary = requireNonNegativeNumber(input.basicSalary, 'basicSalary')
  const positionAllowance =
    input.positionAllowance === undefined ? null : requireNonNegativeNumber(input.positionAllowance, 'positionAllowance')
  const phoneAllowance =
    input.phoneAllowance === undefined ? null : requireNonNegativeNumber(input.phoneAllowance, 'phoneAllowance')
  const transportationAllowance =
    input.transportationAllowance === undefined
      ? null
      : requireNonNegativeNumber(input.transportationAllowance, 'transportationAllowance')

  const compensationRef = employeeRef.collection('compensation').doc('current')
  const previousSnap = await compensationRef.get()

  const newValues = {
    basicSalary,
    positionAllowance,
    phoneAllowance,
    transportationAllowance,
    bankAccountName: input.bankAccountName?.trim() || null,
    bankAccountNumber: input.bankAccountNumber?.trim() || null,
  }

  await compensationRef.set({ ...newValues, ...updatedFields(user.uid) })

  // Deliberately resourceType 'employeeCompensation', not 'employee' — this
  // keeps it out of getEmployeeAuditLog's Change History card, which is
  // gated only by EMPLOYEES_UPDATE (a wider audience than salary should
  // reach). Also deliberately not recordEmployeeActivity, whose timeline
  // firestore.rules exposes to GM/Director as well.
  await recordAuditEvent({
    eventType: 'EmployeeCompensationUpdated',
    category: 'HR',
    module: 'hr',
    resourceType: 'employeeCompensation',
    resourceId: employeeId,
    action: 'update',
    user,
    previousValues: previousSnap.exists ? (previousSnap.data() as Record<string, unknown>) : undefined,
    newValues,
  })
}

/**
 * Bank details only — welcome-portal.md §4.3's "confidential/compensation",
 * which resolves to the sub-collection that already exists here rather than a
 * new one. Deliberately NOT setEmployeeCompensationInternal: that one requires
 * `basicSalary` and writes the whole document, so a new hire submitting their
 * BCA number through the welcome portal would wipe salary and every allowance.
 *
 * `merge: true` is the whole point of this function. The caller is responsible
 * for authorization — submitWelcomeForm's magic-link token is what stands in
 * for EMPLOYEES_READ_SENSITIVE there, and the hire can only ever reach their
 * own record.
 */
export async function setEmployeeBankDetailsInternal(
  actor: AuthedUser,
  employeeId: string,
  input: { bankAccountName: string; bankAccountNumber: string },
): Promise<void> {
  const compensationRef = db
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeId)
    .collection('compensation')
    .doc('current')

  const newValues = {
    // §4.2 — the server uppercases the account name; banks print it that way
    // and HR should not have to normalise it by hand at verification.
    bankAccountName: input.bankAccountName.trim().toUpperCase(),
    bankAccountNumber: input.bankAccountNumber.trim(),
  }

  await compensationRef.set({ ...newValues, ...updatedFields(actor.uid) }, { merge: true })

  // Same deliberate resourceType as setEmployeeCompensationInternal — keeps it
  // out of getEmployeeAuditLog's Change History card.
  await recordAuditEvent({
    eventType: 'EmployeeBankDetailsUpdated',
    category: 'HR',
    module: 'hr',
    resourceType: 'employeeCompensation',
    resourceId: employeeId,
    action: 'update',
    user: actor,
    // Deliberately no previousValues and no account number in newValues: this
    // audit trail is readable by a wider set than the compensation document
    // itself, so it records that the number changed, not what it is.
    newValues: { bankAccountName: newValues.bankAccountName, bankAccountNumber: '[redacted]' },
  })
}

/**
 * §12.1: salary/allowance/bank data, split into its own restricted
 * sub-collection (employees/{employeeId}/compensation/current) rather than
 * fields on the employee doc — firestore.rules can't hide individual fields,
 * and this document is readable by GM/Director/department leaders.
 */
export const updateEmployeeCompensation = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_READ_SENSITIVE)

    const input = (request.data ?? {}) as Partial<CompensationInput> & { employeeId?: string }
    if (!input.employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }

    await setEmployeeCompensationInternal(user, input.employeeId, input)

    return successResponse(undefined, 'Compensation updated.')
  } catch (error) {
    handleError(error)
  }
})
