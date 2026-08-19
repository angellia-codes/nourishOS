import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, PackageX, Plus, Sunrise, Sunset } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as shiftReportService from '../shiftReportService'
import { REPORT_TYPE_LABELS, flaggedIssues, formatReportDate, outletName } from '../shiftReportFormat'
import type { ShiftReport } from '@/types'

/** opening_closing_shift_report_template.md — the register of filed shift reports. */
export function ShiftReportsFeedPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<ShiftReport[] | null>(null)

  useEffect(() => {
    return shiftReportService.subscribeToShiftReports(setReports)
  }, [])

  if (reports === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Shift Reports</h1>
          <p className="text-sm text-muted-foreground">Opening and closing reports across all outlets.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.SHIFT_REPORTS_SUBMIT}>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/operations/shift-reports/new/opening')}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Opening
            </Button>
            <Button onClick={() => navigate('/operations/shift-reports/new/closing')}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Closing
            </Button>
          </div>
        </PermissionGuard>
      </div>

      {reports.length === 0 ? (
        <EmptyState title="No shift reports yet" description="Reports filed at the start and end of each shift appear here." />
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((report) => {
            const issues = flaggedIssues(report)
            const TypeIcon = report.reportType === 'opening' ? Sunrise : Sunset
            return (
              <Card key={report.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/operations/shift-reports/${report.id}`)}
                    className="flex flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {outletName(report.outletId)} &middot; {report.shift}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatReportDate(report.date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <TypeIcon className="h-4 w-4" aria-hidden="true" />
                      {REPORT_TYPE_LABELS[report.reportType]}
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {report.unavailableItems.length > 0 && (
                      <Badge variant="warning">
                        <PackageX className="h-3 w-3" aria-hidden="true" />
                        {report.unavailableItems.length} unavailable
                      </Badge>
                    )}
                    {issues.map((issue) => (
                      <Badge key={issue.label} variant="error">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {issue.label}
                      </Badge>
                    ))}
                    {report.unavailableItems.length === 0 && issues.length === 0 && (
                      <span className="text-xs text-muted-foreground">Routine shift — nothing flagged.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
