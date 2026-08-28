import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency } from '@/utils'
import { ValidationIssueList } from './ValidationIssueList'
import type { ReconciliationReport } from '@/types'

/**
 * §6.1 — what HR sees before anything is written.
 *
 * The report is advisory: createPayrollBatch re-derives every check server-side
 * against freshly-read data. What this view is for is letting a human see the
 * month's shape, and the statutory exceptions, before authorising it.
 */
export function ReconciliationPreview({ report }: { report: ReconciliationReport }) {
  const blocked = report.hardFailures.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Rows" value={String(report.rowCount)} />
        <SummaryTile label="Take home pay" value={formatCurrency(report.totals.totalTakeHomePay)} />
        <SummaryTile label="Employer contributions" value={formatCurrency(report.totals.totalEmployerCost)} />
        <SummaryTile label="Parameters year" value={String(report.parametersYear)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{blocked ? 'Blocking problems' : 'Validation'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ValidationIssueList issues={report.hardFailures} severity="hardFailure" />
        </CardContent>
      </Card>

      {report.overriddenRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statutory overrides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {/* §6.4/§12 — the bypass exists so legitimate exceptions leave a
                trace. The reason is persisted on the payslip, listed on the
                batch, and written to the audit log. */}
            <p className="text-sm text-muted-foreground">
              {report.overriddenRows.length} row(s) supplied a reason and skipped the statutory recompute. Each reason
              is recorded on the payslip and in the audit log.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {report.overriddenRows.map((employeeNumber) => (
                <li
                  key={employeeNumber}
                  className="rounded-md border border-border bg-sunken px-2 py-0.5 font-mono text-xs"
                >
                  {employeeNumber}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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

/** Local rather than shared MetricTile, which takes a raw number — these are formatted currency. */
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
