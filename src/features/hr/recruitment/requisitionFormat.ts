import type { RequisitionStatus } from '@/types'

// Shared enum lookups (urgency/employment/requisition-type/vacancy-stage) and
// the date/IDR formatters are identical between the demo and the real flow —
// reuse them rather than duplicating (same convention as the demo modules).
export {
  formatRequisitionDate,
  formatIdr,
  VACANCY_STAGE_LABELS,
  VACANCY_STAGE_VARIANT,
  URGENCY_LABELS,
  URGENCY_VARIANT,
  EMPLOYMENT_TYPE_LABELS,
  REQUISITION_TYPE_LABELS,
} from './employeeRequisitionFormat'

/** Real-flow status is camelCase (Approval Engine convention) — cf. requisition.types.ts. */
export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Draft',
  pendingApproval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  returnedForRevision: 'Returned for Revision',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export const REQUISITION_STATUS_VARIANT: Record<RequisitionStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  pendingApproval: 'warning',
  approved: 'success',
  rejected: 'error',
  returnedForRevision: 'error',
  cancelled: 'neutral',
  completed: 'success',
}
