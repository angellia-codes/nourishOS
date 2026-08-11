import { Pencil, Send, Clock, Undo2, Check, X, TimerOff, Ban, CheckCheck, type LucideIcon } from 'lucide-react'
import { StatusPill, type StatusTone } from '@/components/ui'
import type { ApprovalStatus } from '@/constants/statuses'

// STYLE_GUIDE.md § Shared components — StatusPill is the generic renderer;
// this owns the appraisal-specific label/tone/icon mapping.
const CONFIG: Record<ApprovalStatus, { label: string; tone: StatusTone; icon: LucideIcon; pulseDot?: boolean }> = {
  draft: { label: 'Draft', tone: 'draft', icon: Pencil },
  submitted: { label: 'Submitted', tone: 'info', icon: Send },
  pending: { label: 'Pending GM Approval', tone: 'warning', icon: Clock, pulseDot: true },
  returnedForRevision: { label: 'Returned for Revision', tone: 'warning', icon: Undo2 },
  approved: { label: 'Approved', tone: 'success', icon: Check },
  rejected: { label: 'Rejected', tone: 'error', icon: X },
  expired: { label: 'Expired', tone: 'error', icon: TimerOff },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
  completed: { label: 'Completed', tone: 'closed', icon: CheckCheck },
}

export function AppraisalStatusBadge({ status }: { status: ApprovalStatus }) {
  const { label, tone, icon, pulseDot } = CONFIG[status]
  return <StatusPill tone={tone} icon={icon} label={label} pulseDot={pulseDot} />
}
