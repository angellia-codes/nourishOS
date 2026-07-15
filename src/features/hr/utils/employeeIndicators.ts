import type { Employee } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null
  const target = new Date(`${isoDate}T00:00:00`).getTime()
  if (Number.isNaN(target)) return null
  return Math.ceil((target - Date.now()) / DAY_MS)
}

/** M01-F10: contract expires within 90 days (and hasn't already ended long ago is still flagged at ≤0). */
export function isContractExpiringSoon(employee: Employee, withinDays = 90): boolean {
  if (employee.status !== 'active') return false
  const days = daysUntil(employee.contractEndDate)
  return days !== null && days <= withinDays
}

/** M01-F11: probation ends within 30 days. */
export function isProbationEndingSoon(employee: Employee, withinDays = 30): boolean {
  if (employee.status !== 'active') return false
  const days = daysUntil(employee.probationEndDate)
  return days !== null && days >= 0 && days <= withinDays
}

/** M01-F09: tenure auto-calculated from join date, e.g. "2 yr 4 mo". */
export function formatTenure(joinDate: string): string {
  const start = new Date(`${joinDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return '—'
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) return '—'
  if (months < 1) return '< 1 mo'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${rest} mo`
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`
}

/** "12 Mar 1994" from a stored 'YYYY-MM-DD' civil date. */
export function formatIsoDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
