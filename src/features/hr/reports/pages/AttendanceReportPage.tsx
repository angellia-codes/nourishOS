import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Clock, TimerReset, Users, type LucideIcon } from 'lucide-react'
import { Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState, MetricTile, ReportTable, BarDiagram, type ReportTableColumn } from '@/components/shared'
import { EMPLOYMENT_STATUS_LABELS, OUTLETS } from '@/constants'
import { downloadCsv, toCsv } from '@/utils/csv'
import * as attendanceService from '@/features/hr/attendance/attendanceService'
import { CODE_LABELS, formatPercent, formatPeriod } from '@/features/hr/attendance/attendanceFormat'
import {
  buildAttendanceReportRows,
  departmentsIn,
  filterAttendanceRecords,
  leaveBreakdown,
  type AttendanceGroupBy,
} from '../utils/attendance'
import type { AttendancePeriod, AttendanceRecord } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

const SUMMARY_COLUMNS: ReportTableColumn<ReturnType<typeof buildAttendanceReportRows>[number]>[] = [
  { header: 'Group', value: (r) => r.label },
  { header: 'Headcount', value: (r) => String(r.headcount), align: 'right' },
  { header: 'Working days', value: (r) => String(r.totalWD), align: 'right' },
  { header: 'Attendance rate', value: (r) => formatPercent(r.attendanceRate), align: 'right' },
  { header: 'Unpaid leave', value: (r) => String(r.totalUL), align: 'right' },
  { header: 'Entitled leave', value: (r) => String(r.totalEntitledLeave), align: 'right' },
  { header: 'Late incidents', value: (r) => String(r.lateIncidents), align: 'right' },
  { header: 'Punctuality rate', value: (r) => formatPercent(r.punctualityRate), align: 'right' },
]

const DETAIL_COLUMNS: ReportTableColumn<AttendanceRecord>[] = [
  { header: 'Employee #', value: (r) => r.employeeNumber },
  { header: 'Name', value: (r) => r.employeeNameSnapshot },
  { header: 'Department', value: (r) => r.departmentSnapshot },
  { header: 'Outlet', value: (r) => OUTLET_NAMES[r.outletIdSnapshot] ?? r.outletIdSnapshot },
  { header: 'WD', value: (r) => String(r.days.WD), align: 'right' },
  { header: 'PH', value: (r) => String(r.days.PH), align: 'right' },
  { header: 'DP', value: (r) => String(r.days.DP), align: 'right' },
  { header: 'AL', value: (r) => String(r.days.AL), align: 'right' },
  { header: 'MC', value: (r) => String(r.days.MC), align: 'right' },
  { header: 'EO', value: (r) => String(r.days.EO), align: 'right' },
  { header: 'SL', value: (r) => String(r.days.SL), align: 'right' },
  { header: 'DO', value: (r) => String(r.days.DO), align: 'right' },
  { header: 'UL', value: (r) => String(r.days.UL), align: 'right' },
  { header: 'Late', value: (r) => String(r.lateCount), align: 'right' },
  { header: 'Total', value: (r) => String(r.totalDays), align: 'right' },
]

/**
 * attendance.md §7 — People → Reports → Attendance. Client-side aggregation
 * over one period's ~161 records, same "single subscription, filter/aggregate
 * client-side" convention every other HR report follows — no backend
 * aggregation needed, since attendance carries no compensation data requiring
 * server-side hiding (§8).
 */
export function AttendanceReportPage() {
  const [periods, setPeriods] = useState<AttendancePeriod[] | null>(null)
  const [periodId, setPeriodId] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)
  const [outletId, setOutletId] = useState('')
  const [department, setDepartment] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [groupBy, setGroupBy] = useState<AttendanceGroupBy>('department')

  useEffect(() => attendanceService.subscribeToAttendancePeriods(setPeriods), [])

  // §7.1 — defaults to the most recent approved period, newest first.
  useEffect(() => {
    if (periodId || !periods) return
    const approved = periods.filter((p) => p.status === 'approved')
    if (approved.length > 0) setPeriodId(approved[0].id)
  }, [periods, periodId])

  useEffect(() => {
    if (!periodId) {
      setRecords(null)
      return
    }
    return attendanceService.subscribeToAttendanceRecords(periodId, setRecords, () => setRecords([]))
  }, [periodId])

  const filtered = useMemo(
    () => filterAttendanceRecords(records ?? [], { outletId, department, employmentStatus }),
    [records, outletId, department, employmentStatus],
  )
  const rows = useMemo(() => buildAttendanceReportRows(filtered, groupBy), [filtered, groupBy])
  const departments = useMemo(() => departmentsIn(records ?? []), [records])
  const breakdown = useMemo(() => leaveBreakdown(filtered), [filtered])

  const totalWD = filtered.reduce((sum, r) => sum + r.days.WD, 0)
  const totalUL = filtered.reduce((sum, r) => sum + r.days.UL, 0)
  const attendanceRatePct = totalWD + totalUL === 0 ? 0 : totalWD / (totalWD + totalUL)
  const lateIncidents = filtered.reduce((sum, r) => sum + r.lateCount, 0)

  const approvedPeriods = (periods ?? []).filter((p) => p.status === 'approved')

  function handleExport() {
    const csv = toCsv(filtered, [
      { header: 'employee_number', value: (r) => r.employeeNumber },
      { header: 'name', value: (r) => r.employeeNameSnapshot },
      { header: 'department', value: (r) => r.departmentSnapshot },
      { header: 'outlet', value: (r) => OUTLET_NAMES[r.outletIdSnapshot] ?? r.outletIdSnapshot },
      { header: 'WD', value: (r) => String(r.days.WD) },
      { header: 'PH', value: (r) => String(r.days.PH) },
      { header: 'DP', value: (r) => String(r.days.DP) },
      { header: 'AL', value: (r) => String(r.days.AL) },
      { header: 'MC', value: (r) => String(r.days.MC) },
      { header: 'EO', value: (r) => String(r.days.EO) },
      { header: 'SL', value: (r) => String(r.days.SL) },
      { header: 'DO', value: (r) => String(r.days.DO) },
      { header: 'UL', value: (r) => String(r.days.UL) },
      { header: 'late_count', value: (r) => String(r.lateCount) },
      { header: 'total', value: (r) => String(r.totalDays) },
    ])
    downloadCsv(csv, `attendance-${periodId}.csv`)
  }

  if (periods === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Attendance Report</h1>
        <p className="text-sm text-muted-foreground">Total attendance, leave utilisation and punctuality, by period.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} aria-label="Period" className="max-w-56">
          <option value="">Choose a period</option>
          {approvedPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPeriod(p.period)}
            </option>
          ))}
        </Select>
        <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Outlet" className="max-w-48">
          <option value="">All outlets</option>
          {OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department" className="max-w-48">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          value={employmentStatus}
          onChange={(e) => setEmploymentStatus(e.target.value)}
          aria-label="Employment status"
          className="max-w-48"
        >
          <option value="">All statuses</option>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as AttendanceGroupBy)}
          aria-label="Group by"
          className="max-w-40"
        >
          <option value="department">Group: Department</option>
          <option value="outlet">Group: Outlet</option>
          <option value="employee">Group: Employee</option>
        </Select>
      </div>

      {!periodId ? (
        <EmptyState title="Choose an approved period" description="No approved attendance periods exist yet." />
      ) : records === null ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile label="Headcount" value={filtered.length} icon={Users} />
            <MetricTile label="Total working days" value={totalWD} icon={CalendarCheck} />
            <PercentTile label="Attendance rate" value={attendanceRatePct} icon={TimerReset} />
            <MetricTile label="Late incidents" value={lateIncidents} icon={Clock} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground">Summary — by {groupBy}</h2>
            {rows.length === 0 ? (
              <EmptyState title="No records for this filter" />
            ) : (
              <ReportTable columns={SUMMARY_COLUMNS} rows={rows} rowKey={(r) => r.key} />
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground">Leave breakdown</h2>
            <BarDiagram items={breakdown.map((b) => ({ label: CODE_LABELS[b.code].en, value: b.total }))} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Detail — by employee</h2>
              <button type="button" className="text-xs font-medium text-primary underline" onClick={handleExport}>
                Export CSV
              </button>
            </div>
            {filtered.length === 0 ? (
              <EmptyState title="No records for this filter" />
            ) : (
              <ReportTable columns={DETAIL_COLUMNS} rows={filtered} rowKey={(r) => r.id} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** MetricTile's `value` is a raw number (tabular-nums); a percentage needs its own '%' suffix, so it gets its own small tile. */
function PercentTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatPercent(value)}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
