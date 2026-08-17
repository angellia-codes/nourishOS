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

interface UpdateEmployeeCompensationInput {
  employeeId: string
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
 * §12.1: salary/allowance/bank data, split into its own restricted
 * sub-collection (employees/{employeeId}/compensation/current) rather than
 * fields on the employee doc — firestore.rules can't hide individual fields,
 * and this document is readable by GM/Director/department leaders.
 */
export const updateEmployeeCompensation = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_READ_SENSITIVE)

    const input = (request.data ?? {}) as Partial<UpdateEmployeeCompensationInput>
    if (!input.employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(input.employeeId)
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
      resourceId: input.employeeId,
      action: 'update',
      user,
      previousValues: previousSnap.exists ? (previousSnap.data() as Record<string, unknown>) : undefined,
      newValues,
    })

    return successResponse(undefined, 'Compensation updated.')
  } catch (error) {
    handleError(error)
  }
})
