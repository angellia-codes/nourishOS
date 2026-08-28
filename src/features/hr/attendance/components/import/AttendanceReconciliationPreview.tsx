import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ValidationIssueList } from '@/features/hr/payroll/components/import'
import { formatPercent } from '../../attendanceFormat'
import type { AttendanceReconciliationReport } from '@/types'

/**
 * attendance.md §5.3 — what HR sees before anything is written: row counts,
 * every failure/warning, an aggregate preview, and a diff against the
 * previous period so an order-of-magnitude error is visible before commit.
 *
 * `importAttendancePeriod` re-derives every check server-side against
 * freshly-read data — this view is advisory, never the gate. Reuses
 * ValidationIssueList from Payroll's own import components: the issue shape
 * (severity/row/employeeNumber/code/message) is identical.
 */
export function AttendanceReconciliationPreview({ report }: { report: AttendanceReconciliationReport }) {
  const blocked = report.hardFailures.length > 0
  const rate =
    report.totals.totalWD + report.totals.totalUL === 0
      ? 0
      : report.totals.totalWD / (report.totals.totalWD + report.totals.totalUL)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Employees" value={String(report.totals.headcount)} />
        <SummaryTile label="Total working days" value={String(report.totals.totalWD)} />
        <SummaryTile label="Attendance rate" value={formatPercent(rate)} />
        <SummaryTile label="Unpaid leave days" value={String(report.totals.totalUL)} />
      </div>

      {report.previousTotals && (
        <Card>
          <CardHeader>
            <CardTitle>Compared to the previous period</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DiffTile label="Employees" current={report.totals.headcount} previous={report.previousTotals.headcount} />
            <DiffTile label="Working days" current={report.totals.totalWD} previous={report.previousTotals.totalWD} />
            <DiffTile label="Unpaid leave" current={report.totals.totalUL} previous={report.previousTotals.totalUL} />
            <DiffTile
              label="Late incidents"
              current={report.totals.totalLateIncidents}
              previous={report.previousTotals.totalLateIncidents}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{blocked ? 'Blocking problems' : 'Validation'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ValidationIssueList issues={report.hardFailures} severity="hardFailure" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ValidationIssueList issues={report.warnings} severity="warning" />
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function DiffTile({ label, current, previous }: { label: string; current: number; previous: number }) {
  const delta = current - previous
  const sign = delta > 0 ? '+' : ''
  return (
    <div>
      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
        {current}
        {previous !== 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({sign}{delta})</span>}
      </p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
