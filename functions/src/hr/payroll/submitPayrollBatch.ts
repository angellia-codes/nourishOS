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
import { submitApprovalInternal } from '../../shared/approval/submitApproval'

/**
 * payroll-components-payslip-design.md §6.1/§7 — moves a draft batch onto the
 * 'hr/payrollBatch' approval chain. Nothing in the batch is readable as a
 * payslip until that chain resolves approved.
 */
export const submitPayrollBatch = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_IMPORT)

    const { batchId } = (request.data ?? {}) as { batchId?: string }
    if (!batchId) {
      throw new AppError('invalid-argument', 'batchId is required.')
    }

    const ref = db.collection(COLLECTIONS.PAYROLL_BATCHES).doc(batchId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Payroll batch not found.')
    }
    const batch = snap.data()!

    if (batch.status !== 'draft' && batch.status !== 'rejected') {
      throw new AppError('failed-precondition', `A batch in "${batch.status}" cannot be submitted.`)
    }
    // Defence in depth: createPayrollBatch already refuses to write a batch
    // carrying hard failures, so this only fires if one were introduced later.
    const hardFailures = (batch.reconciliation?.hardFailures ?? []) as unknown[]
    if (hardFailures.length > 0) {
      throw new AppError('failed-precondition', 'This batch has unresolved validation failures.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'payrollBatch',
      resourceId: batchId,
      requestedBy: user.uid,
      priority: 'high',
    })

    await ref.update({
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'PayrollBatchSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'payrollBatch',
      resourceId: batchId,
      action: 'submit',
      user,
      newValues: { approvalRequestId, period: batch.period, totals: batch.totals },
    })

    return successResponse({ approvalRequestId }, 'Payroll batch submitted for approval.')
  } catch (error) {
    handleError(error)
  }
})
