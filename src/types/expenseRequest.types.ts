import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'

/** expense-request.md §6 — category (camelCase keys). */
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

/** expense-request.md §6 — status lifecycle (draft → approval phases → paid/closed). */
export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'returnedForRevision'
  | 'cancelled'
  | 'paid'
  | 'closed'

export interface ExpenseItem {
  description: string
  amount: number
  category?: ExpenseCategory
}

/**
 * Expense reimbursement request — expense-request.md §6. Items are embedded
 * (§5); receipts are NOT stored inline — like PatrolLog/LostFound/Incident,
 * clients query `files` by resourceType 'expenseRequest' / resourceId instead.
 */
export interface ExpenseRequest extends BaseDocument {
  /** Auto-generated server-side: EXP-2026-0001. */
  requestNumber: string

  requestedBy: string
  purpose: string
  category: ExpenseCategory
  costCenterId?: string | null
  expenseDate: string // ISO date

  items: ExpenseItem[]
  totalAmount: number

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: ExpenseStatus
  approvalRequestId?: string | null

  paidAt?: Timestamp | null
  paidBy?: string | null
  paymentReference?: string | null
}
