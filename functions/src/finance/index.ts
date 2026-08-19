import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../lib'
import { registerApprovalResolvedHandler } from '../shared/approval'
import { sendNotificationInternal, notifyUsersByRole } from '../shared/notifications'

export { createExpenseRequest } from './createExpenseRequest'
export { updateExpenseRequest } from './updateExpenseRequest'
export { submitExpenseRequest } from './submitExpenseRequest'
export { markExpensePaid } from './markExpensePaid'
export { closeExpenseRequest } from './closeExpenseRequest'
export { buildExpenseApprovalSteps, EXPENSE_APPROVAL_THRESHOLD_IDR } from './expenseSteps'

/**
 * Module-load-time registration (shared/approval/registry.ts): when the
 * 'finance/expenseRequest' route resolves, mirror the outcome onto the request.
 *
 * Note this runs in `onApprovalRequestResolved`, a Firestore onDocumentUpdated
 * trigger — it fires *after* the engine's transaction commits, not inside it, so
 * there is a beat between the last approval and this status flip.
 * expense-request.md §10 AC-4 claims otherwise; the code is what it is.
 */
registerApprovalResolvedHandler('expenseRequest', async (event) => {
  const ref = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing expense request ${event.resourceId}`)
    return
  }
  const expense = snap.data()!
  const approved = event.newStatus === 'approved'
  const label = (expense.requestNumber as string | null) ?? 'The expense request'

  await ref.update({
    status: event.newStatus,
    approvedAt: approved ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await sendNotificationInternal({
    type: 'alert',
    title: approved ? 'Expense approved' : 'Expense rejected',
    message: approved
      ? `${label} is approved and waiting for Finance to pay it.`
      : `${label} was rejected. See the approval history for the reason.`,
    module: 'finance',
    priority: 'high',
    recipientUid: expense.requestedBy as string,
    referenceModule: 'finance',
    referenceId: event.resourceId,
    actionUrl: `/finance/expenses/${event.resourceId}`,
  })

  if (!approved) return

  // §8: a fully approved request is Finance's queue, not the requester's.
  await notifyUsersByRole({
    role: 'finance',
    module: 'finance',
    title: 'Expense ready to pay',
    message: `${label} — IDR ${Number(expense.totalAmount ?? 0).toLocaleString('id-ID')} — is approved and ready for payment.`,
    referenceId: event.resourceId,
    priority: 'high',
  })
})
