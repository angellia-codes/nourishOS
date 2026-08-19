import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { ExpenseCategory, ExpenseItem, ExpenseRequest } from '@/types'

export interface ExpenseRequestInput {
  purpose: string
  category: ExpenseCategory
  expenseDate: string
  items: ExpenseItem[]
  notes?: string
  costCenterId?: string
  /** Both default to the caller's own if omitted. */
  outletId?: string
  departmentId?: string
}

export function createExpenseRequest(
  input: ExpenseRequestInput,
): Promise<{ expenseRequestId: string; totalAmount: number }> {
  return callFunction('createExpenseRequest', input)
}

export function updateExpenseRequest(
  input: ExpenseRequestInput & { expenseRequestId: string },
): Promise<{ expenseRequestId: string; totalAmount: number }> {
  return callFunction('updateExpenseRequest', input)
}

export function submitExpenseRequest(
  expenseRequestId: string,
): Promise<{ expenseRequestId: string; requestNumber: string; totalAmount: number }> {
  return callFunction('submitExpenseRequest', { expenseRequestId })
}

export function markExpensePaid(input: {
  expenseRequestId: string
  paymentReference?: string
}): Promise<{ expenseRequestId: string }> {
  return callFunction('markExpensePaid', input)
}

export function closeExpenseRequest(expenseRequestId: string): Promise<{ expenseRequestId: string }> {
  return callFunction('closeExpenseRequest', { expenseRequestId })
}

export function getExpenseRequest(expenseRequestId: string): Promise<ExpenseRequest | null> {
  return getDocument<ExpenseRequest>(COLLECTIONS.EXPENSE_REQUESTS, expenseRequestId)
}

/**
 * Two queries, one per readable branch of the expenseRequests rule: `null`
 * means "everything", which only Finance and elevated roles may run. A list
 * query that returns a single unreadable row fails in its entirety, so the
 * caller picks by role rather than filtering client-side.
 */
export function subscribeToExpenseRequests(
  uid: string | null,
  onChange: (rows: ExpenseRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ExpenseRequest>(
    COLLECTIONS.EXPENSE_REQUESTS,
    uid
      ? [where('requestedBy', '==', uid), orderBy('createdAt', 'desc')]
      : [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
