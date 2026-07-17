import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { ACTIVE_OUTLET_DEPARTMENTS, MOCK_DAILY_REPORTS } from './dailyUpdateDemoData'
import { CHALLENGE_CATEGORY_LABELS, CHALLENGE_SEVERITY_VARIANT, formatReportDate } from './dailyUpdateFormat'

const TODAY = '2026-07-16'

/**
 * Read-only visual preview of the Daily Updates feed — daily-updates.md §9
 * "Section 2 — Daily Outlet Updates Feed" and the Submission Compliance
 * widget. Mock data, no Firestore subscription, no backend calls.
 */
export function DailyUpdatesFeedDemoPage() {
  const navigate = useNavigate()
  const submittedToday = new Set(MOCK_DAILY_REPORTS.filter((r) => r.date === TODAY).map((r) => `${r.outletId}:${r.departmentId}`))
  const compliancePercent = Math.round((submittedToday.size / ACTIVE_OUTLET_DEPARTMENTS) * 100)

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /operations.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Daily Updates</h1>
            <p className="text-sm text-muted-foreground">Head-of-Department reports across all outlets.</p>
          </div>
          <Button onClick={() => navigate('/demo/operations/daily-updates/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Daily Update
          </Button>
        </div>

        {/* Submission Compliance widget — daily-updates.md §9 */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                compliancePercent < 80 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
              }`}
            >
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {submittedToday.size} of {ACTIVE_OUTLET_DEPARTMENTS} outlet/department reports submitted today
              </p>
              <p className="text-xs text-muted-foreground">{compliancePercent}% submission compliance</p>
            </div>
            {compliancePercent < 80 && <Badge variant="error">Below target</Badge>}
          </CardContent>
        </Card>

        {MOCK_DAILY_REPORTS.length === 0 ? (
          <EmptyState title="No daily updates yet" description="Reports submitted by HODs will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_DAILY_REPORTS.map((report) => (
              <Card key={report.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {report.outletId} &middot; {report.departmentId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatReportDate(report.date)} &middot; Submitted by {report.submittedByName}
                      </p>
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
                    {report.newTaskCount > 0 && (
                      <Badge variant="info">
                        {report.newTaskCount} new task{report.newTaskCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {report.achievements.length === 0 && report.challenges.length === 0 && report.newTaskCount === 0 && (
                      <span className="text-xs text-muted-foreground">Routine day — nothing flagged.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
