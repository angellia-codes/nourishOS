import type { AnnouncementCategory, AnnouncementStatus, AnnouncementAudience } from './communicationsDemoData'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatAnnouncementDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  operations: 'Operations',
  hr: 'HR',
  finance: 'Finance',
  training: 'Training',
  maintenance: 'Maintenance',
  events: 'Events',
  emergency: 'Emergency',
  general: 'General',
}

export const ANNOUNCEMENT_CATEGORY_VARIANT: Record<AnnouncementCategory, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  operations: 'info',
  hr: 'info',
  finance: 'info',
  training: 'neutral',
  maintenance: 'warning',
  events: 'neutral',
  emergency: 'error',
  general: 'neutral',
}

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  review: 'Review',
  published: 'Published',
  archived: 'Archived',
}

export const ANNOUNCEMENT_STATUS_VARIANT: Record<AnnouncementStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  review: 'warning',
  published: 'success',
  archived: 'neutral',
}

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  company_wide: 'Company-wide',
  headquarters: 'Headquarters',
  selected_outlets: 'Selected Outlets',
  departments: 'Departments',
}
