import { OUTLETS } from '@/constants'
import type { ShiftReport, ShiftReportIssue, ShiftReportType, UnavailableCategory } from '@/types'

/** Same civil-date rendering the rest of Operations uses — Lost & Found re-exports it the same way. */
export { formatReportDate } from '../dailyUpdates/dailyUpdateFormat'

export const REPORT_TYPE_LABELS: Record<ShiftReportType, string> = {
  opening: 'Opening Shift',
  closing: 'Closing Shift',
}

/** opening_closing_shift_report_template.md §3's three N/A tables, collapsed into one categorised list. */
export const UNAVAILABLE_CATEGORY_LABELS: Record<UnavailableCategory, string> = {
  food: 'Food',
  cakeGelato: 'Cake / Gelato',
  beverage: 'Beverage',
}

/** Outlet ids are stored, not names — the feed and detail pages show the label. */
export function outletName(outletId: string): string {
  return OUTLETS.find((outlet) => outlet.id === outletId)?.name ?? outletId
}

/** The §6 issue fields, in template order, so the feed and the carry-forward banner agree on what "flagged" means. */
export const ISSUE_FIELDS = [
  { key: 'complaints', label: 'Complaints' },
  { key: 'customerFeedback', label: 'Customer feedback' },
  { key: 'absent', label: 'Absent' },
  { key: 'sickLeave', label: 'Sick leave' },
  { key: 'permission', label: 'Permission' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'hygiene', label: 'Cleaning / hygiene' },
  { key: 'stock', label: 'Stock / inventory' },
] as const satisfies readonly { key: keyof ShiftReport; label: string }[]

/** Every issue the manager ticked "Yes" on. Drives the feed badges and the closing form's carry-forward card. */
export function flaggedIssues(report: ShiftReport): { label: string; details: string }[] {
  return ISSUE_FIELDS.flatMap(({ key, label }) => {
    const issue = report[key] as ShiftReportIssue | undefined
    return issue?.present ? [{ label, details: issue.details }] : []
  })
}
