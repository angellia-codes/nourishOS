import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { EXIT_REASON_LABELS } from '@/constants/exitInterview'
import * as offboardingService from '@/features/hr/offboarding/offboardingService'
import type { ExitInterviewInsights } from '@/features/hr/offboarding/offboardingService'

interface ReasonRow {
  reason: string
  count: number
}

interface TrendRow {
  month: string
  average: number
  count: number
}

const REASON_COLUMNS: ReportTableColumn<ReasonRow>[] = [
  { header: 'Exit Reason', value: (r) => r.reason },
  { header: 'Count', value: (r) => String(r.count), align: 'right' },
]

const TREND_COLUMNS: ReportTableColumn<TrendRow>[] = [
  { header: 'Month', value: (r) => r.month },
  { header: 'Avg. Company Satisfaction', value: (r) => r.average.toFixed(2), align: 'right' },
  { header: 'Responses', value: (r) => String(r.count), align: 'right' },
]

/**
 * exit-interview.md §6 — aggregate-only, via getExitInterviewInsights rather
 * than a direct exitInterviews subscription like the other 9 HR reports:
 * individual records stay hrManager/superAdmin-only, and the §6 minimum-N
 * safeguard (managers with <3 linked interviews are omitted) is enforced
 * server-side, not something a client-side aggregation could honor safely.
 */
export function ExitInterviewInsightsReportPage() {
  const [insights, setInsights] = useState<ExitInterviewInsights | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    offboardingService
      .getExitInterviewInsights()
      .then(setInsights)
      .catch(() => setDenied(true))
  }, [])

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Exit interview insights are limited to HR and above."
        />
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const reasonRows: ReasonRow[] = Object.entries(insights.turnoverReasonBreakdown).map(([reason, count]) => ({
    reason: EXIT_REASON_LABELS[reason as keyof typeof EXIT_REASON_LABELS] ?? reason,
    count,
  }))

  const managerRows = Object.entries(insights.managerRatingAverages)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Exit Interview Insights</h1>
        <p className="text-sm text-muted-foreground">
          {insights.totalInterviews} exit interview{insights.totalInterviews === 1 ? '' : 's'} recorded.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Voluntary vs. Involuntary</h2>
        <p className="text-sm text-foreground">
          {insights.resignationCategory.voluntary} voluntary · {insights.resignationCategory.involuntary} involuntary ·{' '}
          {(insights.resignationCategory.voluntaryRate * 100).toFixed(0)}% voluntary rate
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Turnover Reason Breakdown</h2>
        {reasonRows.length === 0 ? (
          <EmptyState title="No exit interviews yet" />
        ) : (
          <ReportTable columns={REASON_COLUMNS} rows={reasonRows} rowKey={(r) => r.reason} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Company Satisfaction Trend</h2>
        {insights.companySatisfactionTrend.length === 0 ? (
          <EmptyState title="No ratings yet" />
        ) : (
          <ReportTable columns={TREND_COLUMNS} rows={insights.companySatisfactionTrend} rowKey={(r) => r.month} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Manager Ratings</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Only managers with 3 or more linked exit interviews are shown (exit-interview.md §6 safeguard).
        </p>
        {managerRows.length === 0 ? (
          <EmptyState title="No manager has reached the 3-interview threshold yet" />
        ) : (
          <ul className="flex flex-col gap-1">
            {managerRows.map(([managerId, stats]) => (
              <li key={managerId} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{managerId}</span>
                <span>
                  {stats.average.toFixed(2)} avg · {stats.interviewCount} interviews
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
