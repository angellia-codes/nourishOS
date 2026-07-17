import type { DocumentStatus } from './documentsDemoData'

/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatDocumentDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** documents.md §13 "Document Lifecycle". */
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  review: 'Review',
  approved: 'Approved',
  published: 'Published',
  revised: 'Revised',
  archived: 'Archived',
}

export const DOCUMENT_STATUS_VARIANT: Record<DocumentStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  review: 'warning',
  approved: 'info',
  published: 'success',
  revised: 'info',
  archived: 'neutral',
}
