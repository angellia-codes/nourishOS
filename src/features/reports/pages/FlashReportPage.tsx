import { useEffect, useState } from 'react'
import {
  Briefcase,
  CalendarClock,
  FileSignature,
  KanbanSquare,
  ListTodo,
  RefreshCw,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { EmptyState, MetricTile } from '@/components/shared'
import { ApiError } from '@/services/api'
import * as reportService from '../reportService'
import type { FlashReport } from '../reportService'

/**
 * GM Flash Report — HR_OPERATIONS.md Epic E12-US01's manual trigger, and the
 * page that replaces the top-level Reports placeholder.
 *
 * The same figures go out automatically every Monday 07:00 via
 * `sendFlashReport`; this is the "generate it now" view of that job, so it
 * calls the same server-side aggregation rather than recomputing client-side.
 * PDF export is the browser's own print dialog, the convention the ten HR
 * reports already set — there is still no PDF library in this app.
 */
export function FlashReportPage() {
  const [report, setReport] = useState<FlashReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { report: generated } = await reportService.generateFlashReport()
      setReport(generated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate the report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading && !report) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error && !report) {
    return <EmptyState title="Report unavailable" description={error} />
  }

  if (!report) return null

  const compliance =
    report.departmentsExpected === 0
      ? '—'
      : `${report.departmentsReportedToday}/${report.departmentsExpected}`

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 print:max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">GM Flash Report</h1>
          <p className="text-sm text-muted-foreground">
            Weekly operations summary for {report.generatedFor}. Sent automatically every Monday at 07:00.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={load}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
            Regenerate
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricTile label="Active headcount" value={report.activeHeadcount} icon={Users} />
        <MetricTile label="New hires (7 days)" value={report.newHiresLast7Days} icon={UserPlus} />
        <MetricTile label="Open requisitions" value={report.openRequisitions} icon={Briefcase} />
        <MetricTile label="Active projects" value={report.activeProjects} icon={KanbanSquare} />
        <MetricTile label="Open issues" value={report.openIssueCount} icon={ListTodo} />
        <MetricTile label="Escalated 5+ days" value={report.escalatedTaskCount} icon={TriangleAlert} />
        <MetricTile label="Contracts due (30d)" value={report.contractsDueIn30Days} icon={FileSignature} />
        <MetricTile label="Probations due (30d)" value={report.probationsDueIn30Days} icon={CalendarClock} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Daily update compliance today</h2>
        <p className="text-sm text-foreground">{compliance} departments reported.</p>
      </div>
    </div>
  )
}
