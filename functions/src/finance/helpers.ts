import {
  db,
  COLLECTIONS,
  AppError,
  allocateYearlyNumber,
  requirePermission,
  todayIso,
  type AuthedUser,
} from '../lib'

/** expense-request.md §4 Section A. */
export const EXPENSE_CATEGORIES = [
  'officeSupplies',
  'utilities',
  'maintenance',
  'marketing',
  'transportation',
  'training',
  'staffWelfare',
  'foodBeverage',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * expense-request.md §6. The approval-phase values mirror the Approval Engine's
 * own outcome strings so the resolved handler can write `event.newStatus`
 * straight through; `paid` and `closed` are Finance-only states the engine
 * knows nothing about.
 */
export type ExpenseStatus =
  | 'draft'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'paid'
  | 'closed'

export interface ExpenseItemInput {
  description: string
  amount: number
  category?: ExpenseCategory
}

/**
 * requirePermission, but superAdmin always passes — same helper the recruitment
 * module carries, and for the same reason: `roles/superAdmin` was seeded by hand
 * before these strings existed, so a plain check would lock the one account that
 * can fix everything else out of a brand-new module.
 */
export function requireExpensePermission(user: AuthedUser, permission: string): void {
  if (user.roleId === 'superAdmin') return
  requirePermission(user, permission)
}

/** EXP-2026-0001 — expense-request.md §6. */
export function allocateExpenseNumber(): Promise<string> {
  return allocateYearlyNumber('expenseNumberSequences', 'EXP')
}

/**
 * Validates and normalises the item rows, returning them alongside the total the
 * server computed. §10 AC-2: the total is always derived here, never taken from
 * the client — which is also what stops a request understating its way into a
 * shorter approval chain.
 */
export function normaliseItems(raw: unknown): { items: ExpenseItemInput[]; totalAmount: number } {
  if (!Array.isArray(raw)) {
    throw new AppError('invalid-argument', 'items must be an array.')
  }

  const items = raw.map((entry, index) => {
    const item = (entry ?? {}) as Partial<ExpenseItemInput>
    const description = item.description?.trim() ?? ''
    if (!description) {
      throw new AppError('invalid-argument', `Item ${index + 1} needs a description.`)
    }
    if (description.length > 200) {
      throw new AppError('invalid-argument', `Item ${index + 1}'s description must be 200 characters or fewer.`)
    }
    if (typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0) {
      throw new AppError('invalid-argument', `Item ${index + 1} needs an amount greater than zero.`)
    }
    if (item.category !== undefined && !EXPENSE_CATEGORIES.includes(item.category)) {
      throw new AppError('invalid-argument', `Item ${index + 1} has an unknown category.`)
    }
    // Rupiah has no minor unit in practice, and a fractional total would never
    // reconcile against a receipt.
    return {
      description,
      amount: Math.round(item.amount),
      category: item.category ?? null,
    } as ExpenseItemInput
  })

  return { items, totalAmount: items.reduce((sum, item) => sum + item.amount, 0) }
}

/** §4: an expense cannot be dated in the future. Today is the WITA day key, never toISOString(). */
export function validateExpenseDate(expenseDate: unknown): string {
  const value = typeof expenseDate === 'string' ? expenseDate.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('invalid-argument', 'An expense date is required (YYYY-MM-DD).')
  }
  if (value > todayIso()) {
    throw new AppError('invalid-argument', 'The expense date cannot be in the future.')
  }
  return value
}

/** Optional free-text note — context an approver might want that isn't the justification itself. */
export function validateNotes(notes: unknown): string | null {
  const value = typeof notes === 'string' ? notes.trim() : ''
  if (!value) return null
  if (value.length > 1000) {
    throw new AppError('invalid-argument', 'Notes must be 1000 characters or fewer.')
  }
  return value
}

export function validateCategory(category: unknown): ExpenseCategory {
  if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    throw new AppError('invalid-argument', `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}.`)
  }
  return category as ExpenseCategory
}

export function validatePurpose(purpose: unknown): string {
  const value = typeof purpose === 'string' ? purpose.trim() : ''
  if (!value) {
    throw new AppError('invalid-argument', 'A purpose or justification is required.')
  }
  if (value.length > 2000) {
    throw new AppError('invalid-argument', 'Purpose must be 2000 characters or fewer.')
  }
  return value
}

/**
 * §4 Section C: at least one receipt. Attachments are `files` documents queried
 * by resourceType/resourceId — the same convention Employee, Appraisal, Lost &
 * Found and Announcements follow — rather than an array on this document, so
 * this counts them at submit time instead of trusting a denormalised list.
 */
export async function countReceipts(expenseRequestId: string): Promise<number> {
  const snap = await db
    .collection(COLLECTIONS.FILES)
    .where('resourceType', '==', 'expenseRequest')
    .where('resourceId', '==', expenseRequestId)
    .where('fileStatus', '==', 'available')
    .get()
  return snap.size
}

/** Loads the request or throws. Ownership and status checks are the caller's, since they differ per callable. */
export async function loadExpenseRequest(expenseRequestId: unknown) {
  const id = typeof expenseRequestId === 'string' ? expenseRequestId.trim() : ''
  if (!id) {
    throw new AppError('invalid-argument', 'expenseRequestId is required.')
  }

  const ref = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new AppError('not-found', 'That expense request no longer exists.')
  }
  return { ref, data: snap.data()! }
}
