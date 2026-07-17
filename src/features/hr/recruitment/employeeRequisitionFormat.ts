import type { RequisitionStatus, Urgency, VacancyStage, EmploymentType, RequisitionType, ApprovalStepStatus } from './employeeRequisitionDemoData'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatRequisitionDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

/** employee-requisition.md §2 — `status` is the Approval Engine lifecycle. */
export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const REQUISITION_STATUS_VARIANT: Record<RequisitionStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  submitted: 'info',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  completed: 'success',
  cancelled: 'neutral',
}

/** employee-requisition.md §2 — `vacancyStage` only exists once status = approved. */
export const VACANCY_STAGE_LABELS: Record<VacancyStage, string> = {
  open: 'Open',
  sourcing: 'Sourcing',
  interviewing: 'Interviewing',
  offering: 'Offering',
  filled: 'Filled',
  closed: 'Closed',
}

export const VACANCY_STAGE_VARIANT: Record<VacancyStage, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  open: 'info',
  sourcing: 'info',
  interviewing: 'warning',
  offering: 'warning',
  filled: 'success',
  closed: 'neutral',
}

export const URGENCY_LABELS: Record<Urgency, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  critical: 'Critical',
}

export const URGENCY_VARIANT: Record<Urgency, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  normal: 'neutral',
  urgent: 'warning',
  critical: 'error',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  ft: 'Full Time',
  fl: 'Freelance',
  dw: 'Daily Worker',
  ojt: 'On-the-Job Training',
  fixed_term: 'Fixed Term',
}

export const REQUISITION_TYPE_LABELS: Record<RequisitionType, string> = {
  new_position: 'New Position',
  replacement: 'Replacement',
  seasonal: 'Seasonal / Event',
}

export const APPROVAL_STEP_VARIANT: Record<ApprovalStepStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  approved: 'success',
  rejected: 'error',
  pending: 'warning',
  waiting: 'neutral',
}

export const APPROVAL_STEP_LABELS: Record<ApprovalStepStatus, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Awaiting decision',
  waiting: 'Waiting',
}
