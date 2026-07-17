/** "16 Jul 2026" from a stored 'YYYY-MM-DD' civil date — same convention as HR's formatIsoDate. */
export function formatReportDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export const CHALLENGE_SEVERITY_VARIANT = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
} as const

export const CHALLENGE_CATEGORY_LABELS: Record<string, string> = {
  staffing: 'Staffing',
  equipment: 'Equipment',
  supplier: 'Supplier',
  customer: 'Customer',
  facility: 'Facility',
  other: 'Other',
}
