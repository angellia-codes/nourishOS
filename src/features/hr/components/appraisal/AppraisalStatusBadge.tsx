import { Badge, type BadgeProps } from '@/components/ui'
import type { ApprovalStatus } from '@/constants/statuses'

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted: { label: 'Submitted', variant: 'info' },
  pending: { label: 'Pending GM Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  returnedForRevision: { label: 'Returned for Revision', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  completed: { label: 'Completed', variant: 'success' },
  expired: { label: 'Expired', variant: 'error' },
}

export function AppraisalStatusBadge({ status }: { status: ApprovalStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
