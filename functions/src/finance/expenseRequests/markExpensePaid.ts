import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
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
import { sendNotificationInternal } from '../../shared/notifications'

// expense-request.md §7/§8 — disbursement is a separate action from approval,
// gated on EXPENSE_REQUESTS_PAY (Finance only). A GM/Director who approved the
// request cannot pay it unless they also hold this permission (AC-5).
export const markExpensePaid = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EXPENSE_REQUESTS_PAY)

    const { expenseRequestId, paymentReference } = (request.data ?? {}) as {
      expenseRequestId?: string
      paymentReference?: string
    }
    if (!expenseRequestId) {
      throw new AppError('invalid-argument', 'expenseRequestId is required.')
    }
    if (!paymentReference || typeof paymentReference !== 'string') {
      throw new AppError('invalid-argument', 'paymentReference is required.')
    }

    const requestRef = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc(expenseRequestId)
    const snap = await requestRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Expense request not found.')
    }
    const expense = snap.data()!

    if (expense.status !== 'approved') {
      throw new AppError('failed-precondition', `Only approved requests can be paid; this one is ${expense.status}.`)
    }

    await requestRef.update({
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      paidBy: user.uid,
      paymentReference: paymentReference.trim(),
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestPaid',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: expenseRequestId,
      action: 'pay',
      user,
      newValues: { paymentReference: paymentReference.trim() },
    })

    await sendNotificationInternal({
      type: 'alert',
      title: 'Expense Reimbursed',
      message: `Your expense request ${expense.requestNumber} has been paid (ref: ${paymentReference.trim()}).`,
      module: 'finance',
      priority: 'medium',
      recipientUid: expense.requestedBy,
      referenceModule: 'finance',
      referenceId: expenseRequestId,
    })

    return successResponse(undefined, 'Expense request marked as paid.')
  } catch (error) {
    handleError(error)
  }
})
