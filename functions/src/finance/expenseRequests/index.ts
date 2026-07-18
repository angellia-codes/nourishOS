import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'

export { createExpenseRequest } from './createExpenseRequest'
export { submitExpenseRequest } from './submitExpenseRequest'
export { markExpensePaid } from './markExpensePaid'

/**
 * expense-request.md §7/§8 — when the 'finance/expenseRequest' route resolves,
 * mirror the outcome onto the expense doc and notify (AC-4). Approved → notify
 * requester + Finance (Finance disburses next); rejected → notify requester.
 * The Approval Engine stays generic: it dispatches here by resourceType string.
 */
registerApprovalResolvedHandler('expenseRequest', async (event) => {
  const requestRef = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc(event.resourceId)
  const snap = await requestRef.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing expense request ${event.resourceId}`)
    return
  }
  const expense = snap.data()!

  await requestRef.update({
    status: event.newStatus, // 'approved' | 'rejected'
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await sendNotificationInternal({
    type: 'alert',
    title: event.newStatus === 'approved' ? 'Expense Request Approved' : 'Expense Request Rejected',
    message:
      event.newStatus === 'approved'
        ? `Your expense request ${expense.requestNumber} was fully approved and is awaiting payment.`
        : `Your expense request ${expense.requestNumber} was rejected. See the approval history for the reason.`,
    module: 'finance',
    priority: 'medium',
    recipientUid: expense.requestedBy,
    referenceModule: 'finance',
    referenceId: event.resourceId,
  })

  if (event.newStatus === 'approved') {
    await notifyUsersByRole({
      role: 'finance',
      module: 'finance',
      title: 'Expense Ready for Payment',
      message: `${expense.requestNumber} (IDR ${Number(expense.totalAmount).toLocaleString('id-ID')}) is approved and ready to disburse.`,
      referenceId: event.resourceId,
    })
  }
})
