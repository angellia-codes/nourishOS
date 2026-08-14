import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  REGION,
  PERMISSIONS,
  requireActiveUser,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { sendNotificationInternal } from '../shared/notifications'
import { loadExpenseRequest, requireExpensePermission } from './helpers'

/**
 * expense-request.md §7, and §10 AC-5 specifically: this is gated on
 * `expenseRequests.pay`, not on approve. Authorising a spend and moving the
 * money are different actions with different risk, so a General Manager who
 * approved the request cannot also disburse it unless they separately hold the
 * pay permission — which, per ROLE_PERMISSIONS, only Finance does.
 */
export const markExpensePaid = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireExpensePermission(user, PERMISSIONS.EXPENSE_REQUESTS_PAY)

    const { expenseRequestId, paymentReference } = (request.data ?? {}) as {
      expenseRequestId?: string
      paymentReference?: string
    }
    const { ref, data: expense } = await loadExpenseRequest(expenseRequestId)

    if (expense.status !== 'approved') {
      throw new AppError(
        'failed-precondition',
        expense.status === 'paid' || expense.status === 'closed'
          ? 'This expense request has already been paid.'
          : 'Only an approved expense request can be paid.',
      )
    }

    const reference = paymentReference?.trim() ?? ''
    if (reference.length > 120) {
      throw new AppError('invalid-argument', 'Payment reference must be 120 characters or fewer.')
    }

    await ref.update({
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      paidBy: user.uid,
      paymentReference: reference || null,
      ...updatedFields(user.uid),
    })

    const label = (expense.requestNumber as string | null) ?? 'Your expense request'
    await sendNotificationInternal({
      type: 'alert',
      title: 'Expense paid',
      message: `${label} has been paid${reference ? ` (ref ${reference})` : ''}.`,
      module: 'finance',
      priority: 'medium',
      recipientUid: expense.requestedBy as string,
      senderUid: user.uid,
      referenceModule: 'finance',
      referenceId: ref.id,
      actionUrl: `/finance/expenses/${ref.id}`,
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestPaid',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      action: 'pay',
      user,
      severity: 'high',
      previousValues: { status: expense.status },
      newValues: { status: 'paid', totalAmount: expense.totalAmount, paymentReference: reference || null },
    })

    return successResponse({ expenseRequestId: ref.id }, 'Marked as paid.')
  } catch (error) {
    return handleError(error)
  }
})
