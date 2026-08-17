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

interface UpdateRequisitionCompensationInput {
  requisitionId: string
  salaryMin: number
  salaryMax: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
}

function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new AppError('invalid-argument', `${field} must be a non-negative number.`)
  }
  return value
}

/**
 * employee-requisition.md §3-C/§4: salary range + allowances, split into
 * their own restricted subcollection (recruitments/{id}/confidential/compensation)
 * rather than fields on the requisition doc — same reasoning
 * updateEmployeeCompensation.ts already established for employees.
 */
export const updateRequisitionCompensation = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.RECRUITMENT_VIEW_COMPENSATION)

    const input = (request.data ?? {}) as Partial<UpdateRequisitionCompensationInput>
    if (!input.requisitionId) {
      throw new AppError('invalid-argument', 'requisitionId is required.')
    }

    const requisitionRef = db.collection(COLLECTIONS.RECRUITMENTS).doc(input.requisitionId)
    const requisitionSnap = await requisitionRef.get()
    if (!requisitionSnap.exists) {
      throw new AppError('not-found', 'Requisition not found.')
    }

    const salaryMin = requireNonNegativeNumber(input.salaryMin, 'salaryMin')
    const salaryMax = requireNonNegativeNumber(input.salaryMax, 'salaryMax')
    if (salaryMax < salaryMin) {
      throw new AppError('invalid-argument', 'salaryMax must be greater than or equal to salaryMin.')
    }
    const positionAllowance =
      input.positionAllowance === undefined ? null : requireNonNegativeNumber(input.positionAllowance, 'positionAllowance')
    const phoneAllowance =
      input.phoneAllowance === undefined ? null : requireNonNegativeNumber(input.phoneAllowance, 'phoneAllowance')
    const transportationAllowance =
      input.transportationAllowance === undefined
        ? null
        : requireNonNegativeNumber(input.transportationAllowance, 'transportationAllowance')

    const compensationRef = requisitionRef.collection('confidential').doc('compensation')
    const previousSnap = await compensationRef.get()

    const newValues = { salaryMin, salaryMax, positionAllowance, phoneAllowance, transportationAllowance }

    await compensationRef.set({ ...newValues, ...updatedFields(user.uid) })

    // Deliberately resourceType 'requisitionCompensation', not 'requisition' —
    // same reason employeeCompensation stays out of the requisition's own
    // audit trail: this is a narrower audience than the requisition record.
    await recordAuditEvent({
      eventType: 'RequisitionCompensationUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisitionCompensation',
      resourceId: input.requisitionId,
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
