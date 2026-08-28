import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { useFirestoreDoc } from '@/hooks'
import { COLLECTIONS } from '@/constants'
import { CHALLENGE_CATEGORY_LABELS, CHALLENGE_SEVERITY_VARIANT, formatReportDate } from '../dailyUpdateFormat'
import type { DailyReport } from '@/types'

/** Read-only view of a submitted Daily Update — daily-updates.md §9. */
export function DailyUpdateDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()

  const { data: report, loading } = useFirestoreDoc<DailyReport>(COLLECTIONS.DAILY_REPORTS, reportId)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!report) {
    return <p className="text-sm text-muted-foreground">Daily update not found.</p>
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/daily-updates')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {report.outletId} &middot; {report.departmentId}
          </h1>
          <p className="text-sm text-muted-foreground">{formatReportDate(report.date)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staffing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {report.staffPresent}/{report.staffScheduled} present
          </div>
          {report.absences.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">Absences</p>
              {report.absences.map((absence, i) => (
                <p key={i} className="text-sm text-foreground">
                  {absence.name} &mdash; {absence.reason}
                </p>
              ))}
            </div>
          )}
          {report.lateArrivals.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">Late Arrivals</p>
              {report.lateArrivals.map((late, i) => (
                <p key={i} className="flex items-center gap-1.5 text-sm text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {late.name} &mdash; {late.minutesLate} min late
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {report.achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground">None logged.</p>
          ) : (
            report.achievements.map((achievement, i) => (
              <p key={i} className="text-sm text-foreground">
                {achievement}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Challenges / Issues</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {report.challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">None logged.</p>
          ) : (
            report.challenges.map((challenge, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={CHALLENGE_SEVERITY_VARIANT[challenge.severity]}>{CHALLENGE_CATEGORY_LABELS[challenge.category]}</Badge>
                  {challenge.taskId && <Badge variant="info">Follow-up task created</Badge>}
                </div>
                <p className="text-sm text-foreground">{challenge.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(report.newTaskIds.length > 0 || report.carriedForwardTaskIds.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-foreground">
            {report.newTaskIds.length > 0 && <p>{report.newTaskIds.length} new task(s) opened.</p>}
            {report.carriedForwardTaskIds.length > 0 && <p>{report.carriedForwardTaskIds.length} carried-forward task(s) reviewed.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
