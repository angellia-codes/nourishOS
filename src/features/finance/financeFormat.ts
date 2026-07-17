import type { ExpenseCategory, ExpenseStatus, ExpenseApprovalStepStatus } from './financeDemoData'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatFinanceDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

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

/** expense-request.md §6 "status". */
export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pendingApproval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  returnedForRevision: 'Returned for Revision',
  cancelled: 'Cancelled',
  paid: 'Paid',
  closed: 'Closed',
}

export const EXPENSE_STATUS_VARIANT: Record<ExpenseStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  submitted: 'info',
  pendingApproval: 'warning',
  approved: 'success',
  rejected: 'error',
  returnedForRevision: 'error',
  cancelled: 'neutral',
  paid: 'success',
  closed: 'neutral',
}

export const EXPENSE_APPROVAL_STEP_VARIANT: Record<ExpenseApprovalStepStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  approved: 'success',
  rejected: 'error',
  pending: 'warning',
  waiting: 'neutral',
}

export const EXPENSE_APPROVAL_STEP_LABELS: Record<ExpenseApprovalStepStatus, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Awaiting decision',
  waiting: 'Waiting',
}
