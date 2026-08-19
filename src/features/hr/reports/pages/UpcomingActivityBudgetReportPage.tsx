import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { formatDate, formatDateTime } from '@/utils/date'
import { POSITION_LABELS } from '@/constants/positions'
import * as employeeService from '@/features/hr/services/employeeService'
import * as recruitmentService from '@/features/recruitment/recruitmentService'
import type { Employee, Interview, OnboardingChecklist, Requisition } from '@/types'

interface UpcomingRow {
  id: string
  sortKey: string
  type: string
  description: string
  date: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-calendar civil date, never through toISOString/UTC (CLAUDE.md WITA gotcha). */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + days))
}

function buildRows(
  interviews: Interview[],
  checklists: OnboardingChecklist[],
  employees: Employee[],
  requisitions: Requisition[],
  windowEnd: string,
): UpcomingRow[] {
  const rows: UpcomingRow[] = []

  for (const interview of interviews) {
    if (interview.outcome !== 'pending') continue
    if (interview.scheduledAt.slice(0, 10) > windowEnd) continue
    rows.push({
      id: `interview-${interview.id}`,
      sortKey: interview.scheduledAt.slice(0, 10),
      type: 'Interview',
      description: `${interview.candidateName} — ${interview.location}`,
      date: formatDateTime(interview.scheduledAt),
    })
  }

  for (const checklist of checklists) {
    if (checklist.status !== 'inProgress' || !checklist.joinDate) continue
    if (checklist.joinDate > windowEnd) continue
    rows.push({
      id: `onboarding-${checklist.id}`,
      sortKey: checklist.joinDate,
      type: 'Onboarding',
      description: `${checklist.candidateName} joins`,
      date: formatDate(checklist.joinDate),
    })
  }

  for (const employee of employees) {
    if (employee.status !== 'active') continue
    if (employee.contractEndDate && employee.contractEndDate <= windowEnd) {
      rows.push({
        id: `contract-${employee.id}`,
        sortKey: employee.contractEndDate,
        type: 'Contract Expiry',
        description: `${employee.fullName} — ${POSITION_LABELS[employee.position as keyof typeof POSITION_LABELS] ?? employee.position}`,
        date: formatDate(employee.contractEndDate),
      })
    }
    if (employee.probationEndDate && employee.probationEndDate <= windowEnd) {
      rows.push({
        id: `probation-${employee.id}`,
        sortKey: employee.probationEndDate,
        type: 'Probation End',
        description: `${employee.fullName} — ${POSITION_LABELS[employee.position as keyof typeof POSITION_LABELS] ?? employee.position}`,
        date: formatDate(employee.probationEndDate),
      })
    }
  }

  for (const requisition of requisitions) {
    if (!requisition.budgeted || requisition.vacancyStage === null) continue
    if (requisition.vacancyStage === 'filled' || requisition.vacancyStage === 'closed') continue
    if (requisition.targetJoinDate > windowEnd) continue
    rows.push({
      id: `requisition-${requisition.id}`,
      sortKey: requisition.targetJoinDate,
      type: 'Open Requisition',
      description: `${requisition.openings - requisition.filledCount} × ${requisition.position}`,
      date: formatDate(requisition.targetJoinDate),
    })
  }

  return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

const COLUMNS: ReportTableColumn<UpcomingRow>[] = [
  { header: 'Date', value: (r) => r.date },
  { header: 'Type', value: (r) => r.type },
  { header: 'Detail', value: (r) => r.description },
]

/**
 * Forward-looking merge of interviews, onboarding, contract/probation ends
 * and open budgeted requisitions — the "budget" half is headcount still to
 * be filled, not a $ figure (see Manning Budget/Cost for spend).
 */
export function UpcomingActivityBudgetReportPage() {
  const [interviews, setInterviews] = useState<Interview[] | null>(null)
  const [checklists, setChecklists] = useState<OnboardingChecklist[] | null>(null)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [days, setDays] = useState(60)

  useEffect(() => {
    return recruitmentService.subscribeToAllInterviews(setInterviews, () => {
      setDenied(true)
      setInterviews([])
    })
  }, [])

  useEffect(() => {
    return recruitmentService.subscribeToOnboardingChecklists(setChecklists, () => {
      setDenied(true)
      setChecklists([])
    })
  }, [])

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  useEffect(() => {
    return recruitmentService.subscribeToRequisitions(setRequisitions, () => {
      setDenied(true)
      setRequisitions([])
    })
  }, [])

  const windowEnd = useMemo(() => addDays(isoDate(new Date()), days), [days])

  const rows = useMemo(
    () => buildRows(interviews ?? [], checklists ?? [], employees ?? [], requisitions ?? [], windowEnd),
    [interviews, checklists, employees, requisitions, windowEnd],
  )

  if (interviews === null || checklists === null || employees === null || requisitions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Upcoming Activity and Budget Report</h1>
          <p className="text-sm text-muted-foreground">{rows.length} items ahead</p>
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Look-ahead window">
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
        </Select>
      </div>

      {denied && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Some sources (recruitment) couldn't be loaded for your role — this report may be incomplete.
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Nothing ahead" description="No activity or open vacancies in this window." />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
      )}
    </div>
  )
}
