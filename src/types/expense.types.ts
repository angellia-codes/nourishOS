import type { BaseDocument } from './firestore.types'

/** expense-request.md §4 Section A. */
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

/**
 * expense-request.md §6. `draft`…`rejected` mirror the Approval Engine's own
 * outcome strings so the resolved handler writes them straight through; `paid`
 * and `closed` are Finance-only states the engine knows nothing about.
 */
export type ExpenseStatus =
  | 'draft'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'paid'
  | 'closed'

export interface ExpenseItem {
  description: string
  amount: number
  category?: ExpenseCategory | null
}

/**
 * expense-request.md §6, with two deliberate deviations from the documented
 * schema:
 *
 * - Items are embedded rather than living in a separate `expenseItems`
 *   collection (§5). They are always read and written together, and computing
 *   `totalAmount` from the array server-side is what makes "the total equals the
 *   sum of the items" true by construction.
 * - No `receiptFileIds` array — receipts are `files` documents queried by
 *   resourceType `'expenseRequest'` / resourceId, the convention Employee,
 *   Appraisal, Lost & Found and Announcements all follow.
 */
export interface ExpenseRequest extends BaseDocument {
  /** EXP-2026-0001. Null until submit — abandoned drafts would otherwise gap the year's sequence. */
  requestNumber: string | null

  requestedBy: string
  purpose: string
  category: ExpenseCategory
  costCenterId?: string | null
  /** ISO date, never in the future. */
  expenseDate: string
  /** Optional free text — context for the approver that isn't the justification itself. */
  notes?: string | null

  items: ExpenseItem[]
  /** Always derived server-side from `items` — also what decides the approval chain's length. */
  totalAmount: number

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: ExpenseStatus
  approvalRequestId?: string | null
  approvedAt?: string | null

  paidAt?: string | null
  paidBy?: string | null
  paymentReference?: string | null
}
