import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Plus, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as dailyUpdateService from '../dailyUpdateService'
import { CHALLENGE_CATEGORY_LABELS, CHALLENGE_SEVERITY_VARIANT, formatReportDate } from '../dailyUpdateFormat'
import type { DailyReport } from '@/types'

/** daily-updates.md §9 "Section 2 — Daily Outlet Updates Feed." */
export function DailyUpdatesFeedPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<DailyReport[] | null>(null)

  useEffect(() => {
    return dailyUpdateService.subscribeToDailyReports(setReports)
  }, [])

  if (reports === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const submittedTodayCount = reports.filter((r) => r.date === today).length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Daily Updates</h1>
          <p className="text-sm text-muted-foreground">Head-of-Department reports across all outlets.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.DAILY_UPDATES_SUBMIT}>
          <Button onClick={() => navigate('/operations/daily-updates/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Daily Update
          </Button>
        </PermissionGuard>
      </div>

      <p className="text-sm text-muted-foreground">{submittedTodayCount} report(s) submitted today</p>

      {reports.length === 0 ? (
        <EmptyState title="No daily updates yet" description="Reports submitted by HODs will appear here." />
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {report.outletId} &middot; {report.departmentId}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatReportDate(report.date)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {report.staffPresent}/{report.staffScheduled} present
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {report.achievements.length > 0 && (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {report.achievements.length} achievement{report.achievements.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {report.challenges.map((challenge, i) => (
                    <Badge key={i} variant={CHALLENGE_SEVERITY_VARIANT[challenge.severity]}>
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {CHALLENGE_CATEGORY_LABELS[challenge.category]}
                    </Badge>
                  ))}
                  {report.newTaskIds.length > 0 && (
                    <Badge variant="info">
                      {report.newTaskIds.length} new task{report.newTaskIds.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {report.achievements.length === 0 && report.challenges.length === 0 && report.newTaskIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">Routine day — nothing flagged.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
