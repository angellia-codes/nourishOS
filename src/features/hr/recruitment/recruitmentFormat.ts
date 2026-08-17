import {
  CheckCheck,
  CircleDot,
  Clock,
  FileEdit,
  Handshake,
  MessageSquare,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { Candidate, CandidateStage, Requisition, RequisitionStatus, RequisitionUrgency } from '@/types'

/**
 * Status → {tone, icon} maps for the recruitment module. Each module owns its
 * own mapping and reuses the shared StatusPill primitive — same split as
 * incidentFormat.ts / lostFoundFormat.ts.
 */

export const REQUISITION_STATUS_TONE: Record<RequisitionStatus, StatusTone> = {
  draft: 'draft',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  completed: 'closed',
  cancelled: 'neutral',
}

export const REQUISITION_STATUS_ICON: Record<RequisitionStatus, LucideIcon> = {
  draft: FileEdit,
  pending_approval: Clock,
  approved: CheckCheck,
  rejected: XCircle,
  completed: UserCheck,
  cancelled: UserMinus,
}

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Filled',
  cancelled: 'Cancelled',
}

export const CANDIDATE_STAGE_TONE: Record<CandidateStage, StatusTone> = {
  'ST-01': 'draft',
  'ST-02': 'info',
  'ST-03': 'info',
  'ST-04': 'info',
  'ST-05': 'warning',
  'ST-06': 'success',
  'ST-07': 'error',
  'ST-08': 'neutral',
}

export const CANDIDATE_STAGE_ICON: Record<CandidateStage, LucideIcon> = {
  'ST-01': UserPlus,
  'ST-02': Search,
  'ST-03': MessageSquare,
  'ST-04': MessageSquare,
  'ST-05': Handshake,
  'ST-06': UserCheck,
  'ST-07': XCircle,
  'ST-08': UserMinus,
}

/** Rejected and Withdrawn are outcomes, not columns — the board hides them behind a filter. */
export const ACTIVE_STAGES: CandidateStage[] = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06']
export const CLOSED_STAGES: CandidateStage[] = ['ST-07', 'ST-08']

export const URGENCY_TONE: Record<RequisitionUrgency, StatusTone> = {
  normal: 'neutral',
  urgent: 'warning',
  critical: 'error',
}

export const URGENCY_ICON: Record<RequisitionUrgency, LucideIcon> = {
  normal: CircleDot,
  urgent: Clock,
  critical: XCircle,
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  ft: 'Full-time',
  fl: 'Freelance',
  dw: 'Daily worker',
  ojt: 'OJT',
  fixed_term: 'Fixed-term',
}

export const REQUISITION_TYPE_LABELS: Record<string, string> = {
  new_position: 'New position',
  replacement: 'Replacement',
  seasonal: 'Seasonal / event',
}

export const CANDIDATE_SOURCE_LABELS: Record<string, string> = {
  jobPortal: 'Job portal',
  referral: 'Referral',
  socialMedia: 'Social media',
  broadcast: 'Broadcast',
  newspaperAd: 'Newspaper ad',
  appliedDirectly: 'Applied directly',
  otherAdvertisement: 'Other advertisement',
  employmentAgency: 'Employment agency',
  other: 'Other',
}

/** "15 Jul 2026, 18:45" from a stored ISO datetime — same helper shape as incidentFormat.ts. */
export function formatDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—'
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Whole days since the candidate last changed stage — HR_OPERATIONS.md §12.3 daysInCurrentStage, derived not stored. */
export function daysInStage(stageChangedAt: string | null | undefined): number {
  if (!stageChangedAt) return 0
  const changed = new Date(stageChangedAt).getTime()
  if (Number.isNaN(changed)) return 0
  return Math.max(0, Math.floor((Date.now() - changed) / 86_400_000))
}

/** Whole days from application to Hired (ST-06) — HR_OPERATIONS.md 9.4-F06, derived from stageHistory, never hired = null. */
export function timeToHireDays(candidate: Candidate): number | null {
  const hiredEntry = candidate.stageHistory.find((entry) => entry.to === 'ST-06')
  if (!hiredEntry) return null
  const applied = new Date(candidate.applicationDate).getTime()
  const hired = new Date(hiredEntry.timestamp).getTime()
  if (Number.isNaN(applied) || Number.isNaN(hired)) return null
  return Math.max(0, Math.round((hired - applied) / 86_400_000))
}

/**
 * Whole days from approval to the requisition being fully filled —
 * employee-requisition.md §9's time-to-fill metric. Requisition-level, unlike
 * timeToHireDays above (per-candidate) — null until both approvedAt and
 * completedAt exist.
 */
export function timeToFillDays(requisition: Requisition): number | null {
  if (!requisition.approvedAt || !requisition.completedAt) return null
  const approved = new Date(requisition.approvedAt).getTime()
  const completed = new Date(requisition.completedAt).getTime()
  if (Number.isNaN(approved) || Number.isNaN(completed)) return null
  return Math.max(0, Math.round((completed - approved) / 86_400_000))
}
