import { db, COLLECTIONS, AppError } from '../../lib'

// expense-request.md §6 — camelCase category keys, mirrored client-side in
// src/features/finance/financeDemoData.ts.
export type ExpenseCategory =
  | 'officeSupplies'
  | 'utilities'
  | 'maintenance'
  | 'marketing'
  | 'transportation'
  | 'training'
  | 'staffWelfare'
  | 'foodBeverage'
  | 'other'

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'officeSupplies',
  'utilities',
  'maintenance',
  'marketing',
  'transportation',
  'training',
  'staffWelfare',
  'foodBeverage',
  'other',
]

export interface ExpenseItemInput {
  description?: string
  amount?: number
  category?: ExpenseCategory
}

/**
 * Validates the repeatable items list (expense-request.md §4 Section B) and
 * returns the cleaned items plus their server-computed total — the total is
 * NEVER trusted from the client (AC-2). Throws on any invalid item.
 */
export function validateItems(items: ExpenseItemInput[] | undefined): {
  items: { description: string; amount: number; category?: ExpenseCategory }[]
  totalAmount: number
} {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('invalid-argument', 'At least one expense item is required.')
  }
  const clean = items.map((item, i) => {
    if (!item.description || typeof item.description !== 'string') {
      throw new AppError('invalid-argument', `Item ${i + 1}: description is required.`)
    }
    if (typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0) {
      throw new AppError('invalid-argument', `Item ${i + 1}: amount must be a positive number.`)
    }
    if (item.category && !EXPENSE_CATEGORIES.includes(item.category)) {
      throw new AppError('invalid-argument', `Item ${i + 1}: unknown category "${item.category}".`)
    }
    return { description: item.description.trim(), amount: item.amount, ...(item.category ? { category: item.category } : {}) }
  })
  return { items: clean, totalAmount: clean.reduce((sum, item) => sum + item.amount, 0) }
}

/**
 * Next expense request number, e.g. EXP-2026-0001. Resets per year — same
 * transaction-counter shape as allocateIncidentNumber / allocateLostFoundItemNumber.
 */
export async function allocateExpenseRequestNumber(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const key = `EXP-${year}`
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('expenseRequestNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return `${key}-${String(next).padStart(4, '0')}`
}
