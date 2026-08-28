/**
 * Attendance — attendance.md §2/§4. Mirrored server-side in
 * functions/src/hr/attendance/codes.ts — same intentional duplication as
 * collections.ts / permissions.ts / payroll.ts, since functions/ is a
 * separate tsconfig project and cannot import from src/. Change one, change
 * both.
 */

export type AttendanceCode = 'WD' | 'PH' | 'DP' | 'AL' | 'MC' | 'EO' | 'SL' | 'DO' | 'UL'

/** §2 table — every code belongs to exactly one class, and class determines its treatment in every metric. */
export const ATTENDANCE_CODES: readonly AttendanceCode[] = ['WD', 'PH', 'DP', 'AL', 'MC', 'EO', 'SL', 'DO', 'UL']

/** §4.1 — the four identity columns, in fixed order, ahead of the nine codes and late_count. */
export const ATTENDANCE_IDENTITY_COLUMNS = ['employee_number', 'employee_name', 'department', 'outlet'] as const

/** §4.1 — the full 14-column canonical header, in order. */
export const ATTENDANCE_CSV_COLUMNS: readonly string[] = [
  ...ATTENDANCE_IDENTITY_COLUMNS,
  ...ATTENDANCE_CODES,
  'late_count',
]

/** §2.2 (D4, locked) — legacy columns folded server-side at import; listed here only for the template/help text. */
export const ATTENDANCE_ALIAS_COLUMNS: Record<string, AttendanceCode> = {
  NPL: 'UL',
  DPH: 'DP',
  DPN: 'DP',
  OFF: 'DO',
}
