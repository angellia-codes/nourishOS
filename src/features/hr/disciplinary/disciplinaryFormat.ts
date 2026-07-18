import type { AckParty, DisciplinaryStatus, DisciplinaryType } from '@/types'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date. */
export function formatDisciplinaryDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** employee-disciplinary-action.md §3 — ladder labels. */
export const DISCIPLINARY_TYPE_LABELS: Record<DisciplinaryType, string> = {
  coaching: 'Coaching',
  verbalWarning: 'Verbal Warning',
  sp1: 'SP1 — First Written Warning',
  sp2: 'SP2 — Second Written Warning',
  sp3: 'SP3 — Final Written Warning',
  suspensionTermination: 'Suspension / Termination',
}

export const DISCIPLINARY_STATUS_LABELS: Record<DisciplinaryStatus, string> = {
  draft: 'Draft',
  underReview: 'Under Review',
  finalized: 'Finalized',
  expired: 'Expired',
  closed: 'Closed',
}

export const DISCIPLINARY_STATUS_VARIANT: Record<DisciplinaryStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  underReview: 'warning',
  finalized: 'success',
  expired: 'neutral',
  closed: 'neutral',
}

export const ACK_PARTY_LABELS: Record<AckParty, string> = {
  employee: 'Employee',
  departmentHead: 'Department Head',
  generalManager: 'General Manager',
  hrManager: 'HR Manager',
}
