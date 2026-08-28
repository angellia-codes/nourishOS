import { ENTITLED_LEAVE_CODES } from '@/features/hr/attendance/attendanceFormat'
import type { AttendanceCode, AttendanceRecord } from '@/types'

/** attendance.md §7.1. */
export interface AttendanceReportFilters {
  outletId: string
  department: string
  employmentStatus: string
}

export type AttendanceGroupBy = 'department' | 'outlet' | 'employee'

export interface AttendanceReportRow {
  key: string
  label: string
  headcount: number
  totalWD: number
  attendanceRate: number
  totalUL: number
  totalEntitledLeave: number
  lateIncidents: number
  punctualityRate: number
}

export function filterAttendanceRecords(
  records: AttendanceRecord[],
  filters: AttendanceReportFilters,
): AttendanceRecord[] {
  return records.filter(
    (record) =>
      (!filters.outletId || record.outletIdSnapshot === filters.outletId) &&
      (!filters.department || record.departmentSnapshot === filters.department) &&
      (!filters.employmentStatus || record.employmentStatusSnapshot === filters.employmentStatus),
  )
}

/** §7.1 — department options are derived from the data in the selected period, not a fixed enum (O2). */
export function departmentsIn(records: AttendanceRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.departmentSnapshot))).sort()
}

function groupKeyFor(record: AttendanceRecord, groupBy: AttendanceGroupBy): { key: string; label: string } {
  if (groupBy === 'outlet') return { key: record.outletIdSnapshot, label: record.outletIdSnapshot }
  if (groupBy === 'employee') return { key: record.employeeId, label: record.employeeNameSnapshot }
  return { key: record.departmentSnapshot, label: record.departmentSnapshot }
}

/** §7.2 — every formula, per group. */
export function buildAttendanceReportRows(
  records: AttendanceRecord[],
  groupBy: AttendanceGroupBy,
): AttendanceReportRow[] {
  const groups = new Map<string, { label: string; records: AttendanceRecord[] }>()

  for (const record of records) {
    const { key, label } = groupKeyFor(record, groupBy)
    const group = groups.get(key) ?? { label, records: [] }
    group.records.push(record)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .map(([key, { label, records: groupRecords }]) => {
      const totalWD = groupRecords.reduce((sum, r) => sum + r.days.WD, 0)
      const totalUL = groupRecords.reduce((sum, r) => sum + r.days.UL, 0)
      const lateIncidents = groupRecords.reduce((sum, r) => sum + r.lateCount, 0)
      return {
        key,
        label,
        headcount: groupRecords.length,
        totalWD,
        attendanceRate: totalWD + totalUL === 0 ? 0 : totalWD / (totalWD + totalUL),
        totalUL,
        totalEntitledLeave: groupRecords.reduce(
          (sum, r) => sum + ENTITLED_LEAVE_CODES.reduce((s, code) => s + r.days[code], 0),
          0,
        ),
        lateIncidents,
        punctualityRate: totalWD === 0 ? 1 : 1 - lateIncidents / totalWD,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** §7.3 — leave breakdown, entitled-leave codes only, summed across the filtered set. */
export function leaveBreakdown(records: AttendanceRecord[]): { code: AttendanceCode; total: number }[] {
  return ENTITLED_LEAVE_CODES.map((code) => ({
    code,
    total: records.reduce((sum, r) => sum + r.days[code], 0),
  }))
}
