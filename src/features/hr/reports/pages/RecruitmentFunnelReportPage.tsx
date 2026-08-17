import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { DEPARTMENTS, OUTLETS } from '@/constants'
import * as recruitmentService from '@/features/hr/recruitment/recruitmentService'
import { timeToFillDays, timeToHireDays } from '@/features/hr/recruitment/recruitmentFormat'
import type { Candidate, CandidateStage, Requisition } from '@/types'
import { CANDIDATE_STAGE_LABELS, CANDIDATE_STAGES } from '@/types'

const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))
const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

interface FunnelRow {
  stage: CandidateStage
  label: string
  count: number
}

function buildFunnelRows(candidates: Candidate[]): FunnelRow[] {
  return CANDIDATE_STAGES.map((stage) => ({
    stage,
    label: CANDIDATE_STAGE_LABELS[stage],
    count: candidates.filter((c) => c.currentStage === stage || c.stageHistory.some((h) => h.to === stage)).length,
  }))
}

interface TimeToHireRow {
  key: string
  label: string
  hiredCount: number
  averageDays: number
}

function buildTimeToHireRows(
  candidates: Candidate[],
  requisitionsById: Map<string, Requisition>,
  groupBy: (candidate: Candidate, requisition: Requisition | undefined) => string,
): TimeToHireRow[] {
  const groups = new Map<string, number[]>()
  for (const candidate of candidates) {
    if (candidate.currentStage !== 'ST-06') continue
    const days = timeToHireDays(candidate)
    if (days === null) continue
    const requisition = requisitionsById.get(candidate.requisitionId)
    const key = groupBy(candidate, requisition)
    groups.set(key, [...(groups.get(key) ?? []), days])
  }
  return Array.from(groups.entries())
    .map(([label, values]) => ({
      key: label,
      label,
      hiredCount: values.length,
      averageDays: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

const FUNNEL_COLUMNS: ReportTableColumn<FunnelRow>[] = [
  { header: 'Stage', value: (r) => r.label },
  { header: 'Candidates Reached', value: (r) => String(r.count), align: 'right' },
]

const TIME_TO_HIRE_COLUMNS: ReportTableColumn<TimeToHireRow>[] = [
  { header: 'Group', value: (r) => r.label },
  { header: 'Hired', value: (r) => String(r.hiredCount), align: 'right' },
  { header: 'Avg. Time to Hire (days)', value: (r) => String(r.averageDays), align: 'right' },
]

interface TimeToFillRow {
  requisitionId: string
  requisitionNumber: string
  position: string
  days: number
}

const TIME_TO_FILL_COLUMNS: ReportTableColumn<TimeToFillRow>[] = [
  { header: 'Requisition', value: (r) => r.requisitionNumber },
  { header: 'Position', value: (r) => r.position },
  { header: 'Time to Fill (days)', value: (r) => String(r.days), align: 'right' },
]

/** hr.md §16 / HR_OPERATIONS.md 9.4-F08 — pipeline funnel and time-to-hire, by position and department. */
export function RecruitmentFunnelReportPage() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return recruitmentService.subscribeToCandidates(
      (next) => {
        setDenied(false)
        setCandidates(next)
      },
      () => {
        setDenied(true)
        setCandidates([])
      },
    )
  }, [])

  useEffect(() => {
    return recruitmentService.subscribeToRequisitions(
      (next) => setRequisitions(next),
      () => setRequisitions([]),
    )
  }, [])

  const requisitionsById = useMemo(
    () => new Map((requisitions ?? []).map((r) => [r.id, r])),
    [requisitions],
  )

  const funnelRows = useMemo(() => buildFunnelRows(candidates ?? []), [candidates])

  const byPosition = useMemo(
    () => buildTimeToHireRows(candidates ?? [], requisitionsById, (c) => c.positionApplied),
    [candidates, requisitionsById],
  )

  const byDepartment = useMemo(
    () =>
      buildTimeToHireRows(
        candidates ?? [],
        requisitionsById,
        (_c, requisition) =>
          requisition ? (DEPARTMENT_NAMES[requisition.departmentId] ?? requisition.departmentId) : 'Unknown',
      ),
    [candidates, requisitionsById],
  )

  const byOutlet = useMemo(
    () =>
      buildTimeToHireRows(
        candidates ?? [],
        requisitionsById,
        (_c, requisition) => (requisition ? (OUTLET_NAMES[requisition.outletId] ?? requisition.outletId) : 'Unknown'),
      ),
    [candidates, requisitionsById],
  )

  const timeToFillRows = useMemo(
    () =>
      (requisitions ?? [])
        .map((r): TimeToFillRow | null => {
          const days = timeToFillDays(r)
          return days === null ? null : { requisitionId: r.id, requisitionNumber: r.requisitionNumber ?? r.id, position: r.position, days }
        })
        .filter((row): row is TimeToFillRow => row !== null),
    [requisitions],
  )

  if (candidates === null || requisitions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Your role can't view candidates, which this report is built from."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 print:max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Recruitment Funnel Report</h1>
          <p className="text-sm text-muted-foreground">Pipeline funnel and time-to-hire, by position and department.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border bg-sunken px-3 py-2 text-sm font-medium text-foreground"
        >
          Print / Save as PDF
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Pipeline Funnel</h2>
        {funnelRows.every((r) => r.count === 0) ? (
          <EmptyState title="No candidates yet" />
        ) : (
          <ReportTable columns={FUNNEL_COLUMNS} rows={funnelRows} rowKey={(r) => r.stage} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Time to Hire — by Position</h2>
        {byPosition.length === 0 ? (
          <EmptyState title="No hires yet" description="Time-to-hire appears once a candidate reaches Hired." />
        ) : (
          <ReportTable columns={TIME_TO_HIRE_COLUMNS} rows={byPosition} rowKey={(r) => r.key} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Time to Hire — by Department</h2>
        {byDepartment.length === 0 ? (
          <EmptyState title="No hires yet" />
        ) : (
          <ReportTable columns={TIME_TO_HIRE_COLUMNS} rows={byDepartment} rowKey={(r) => r.key} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Time to Hire — by Outlet</h2>
        {byOutlet.length === 0 ? (
          <EmptyState title="No hires yet" />
        ) : (
          <ReportTable columns={TIME_TO_HIRE_COLUMNS} rows={byOutlet} rowKey={(r) => r.key} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Time to Fill — by Requisition</h2>
        <p className="mb-2 text-xs text-muted-foreground">employee-requisition.md §9 — approval to last opening filled.</p>
        {timeToFillRows.length === 0 ? (
          <EmptyState title="No requisitions fully filled yet" />
        ) : (
          <ReportTable columns={TIME_TO_FILL_COLUMNS} rows={timeToFillRows} rowKey={(r) => r.requisitionId} />
        )}
      </div>
    </div>
  )
}
