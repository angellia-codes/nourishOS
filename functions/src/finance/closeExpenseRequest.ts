import { onCall } from 'firebase-functions/v2/https'
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
import { loadExpenseRequest, requireExpensePermission } from './helpers'

/**
 * expense-request.md §7 — `paid` → `closed`, once Finance has reconciled it.
 * Manual only: §7 also floats an auto-close after N days, which would need a
 * scheduled job for a state change nobody is waiting on.
 */
export const closeExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireExpensePermission(user, PERMISSIONS.EXPENSE_REQUESTS_PAY)

    const { expenseRequestId } = (request.data ?? {}) as { expenseRequestId?: string }
    const { ref, data: expense } = await loadExpenseRequest(expenseRequestId)

    if (expense.status !== 'paid') {
      throw new AppError('failed-precondition', 'Only a paid expense request can be closed.')
    }

    await ref.update({ status: 'closed', isArchived: true, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'ExpenseRequestClosed',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      action: 'close',
      user,
      previousValues: { status: expense.status },
      newValues: { status: 'closed' },
    })

    return successResponse({ expenseRequestId: ref.id }, 'Expense request closed.')
  } catch (error) {
    return handleError(error)
  }
})
