import { Timestamp } from 'firebase/firestore'

/** Normalizes a Firestore Timestamp | Date | undefined into a JS Date, or null if absent. */
export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null
  return value instanceof Timestamp ? value.toDate() : value
}

/** e.g. "7 Jul 2026" — for tables, lists, cards. */
export function formatDate(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** e.g. "7 Jul 2026, 14:30" — for audit logs, activity feeds, timestamps needing time precision. */
export function formatDateTime(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** e.g. "2 hours ago", "in 3 days" — for notifications, task due dates. */
export function formatRelativeTime(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const unitSeconds: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]

  const [unit, seconds] =
    unitSeconds.find(([, s]) => absSeconds >= s) ?? unitSeconds[unitSeconds.length - 1]

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return rtf.format(Math.round(diffSeconds / seconds), unit)
}

/** True if the given date/timestamp is before right now — used for overdue task/checklist checks. */
export function isPast(value: Timestamp | Date | null | undefined): boolean {
  const date = toDate(value)
  return date ? date.getTime() < Date.now() : false
}
