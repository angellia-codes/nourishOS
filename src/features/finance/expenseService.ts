import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ExpenseRequest, ExpenseCategory } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateExpenseRequestInput {
  purpose: string
  category: ExpenseCategory
  costCenterId?: string
  expenseDate: string
  items: { description: string; amount: number; category?: ExpenseCategory }[]
}

export function createExpenseRequest(
  input: CreateExpenseRequestInput,
): Promise<{ expenseRequestId: string; requestNumber: string }> {
  return callFunction('createExpenseRequest', input)
}

export function submitExpenseRequest(expenseRequestId: string): Promise<{ approvalRequestId: string }> {
  return callFunction('submitExpenseRequest', { expenseRequestId })
}

export function markExpensePaid(input: { expenseRequestId: string; paymentReference: string }): Promise<void> {
  return callFunction('markExpensePaid', input)
}

export function subscribeToExpenseRequests(onChange: (requests: ExpenseRequest[]) => void): Unsubscribe {
  return subscribeToCollection<ExpenseRequest>(
    COLLECTIONS.EXPENSE_REQUESTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}
