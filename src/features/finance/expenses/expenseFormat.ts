import { FileEdit, Clock, Check, X, Ban, Banknote, Archive, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { ExpenseCategory, ExpenseStatus } from '@/types'

/** expense-request.md §4 Section A. */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  officeSupplies: 'Office Supplies',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  transportation: 'Transportation',
  training: 'Training',
  staffWelfare: 'Staff Welfare',
  foodBeverage: 'Food & Beverage',
  other: 'Other',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  pendingApproval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  paid: 'Paid',
  closed: 'Closed',
}

/** STYLE_GUIDE.md § Shared components — the workflow ramp. */
export const EXPENSE_STATUS_TONE: Record<ExpenseStatus, StatusTone> = {
  draft: 'draft',
  pendingApproval: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'neutral',
  paid: 'info',
  closed: 'closed',
}

export const EXPENSE_STATUS_ICON: Record<ExpenseStatus, LucideIcon> = {
  draft: FileEdit,
  pendingApproval: Clock,
  approved: Check,
  rejected: X,
  cancelled: Ban,
  paid: Banknote,
  closed: Archive,
}

/**
 * IDR has no minor unit in practice, so no decimals — matching how the server
 * rounds each item amount.
 */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** approval_engine.md §6 / expense-request.md §3 — mirrors the server's threshold for the form's hint. */
export const EXPENSE_APPROVAL_THRESHOLD_IDR = 5_000_000

export function isEditable(status: ExpenseStatus): boolean {
  return status === 'draft'
}
