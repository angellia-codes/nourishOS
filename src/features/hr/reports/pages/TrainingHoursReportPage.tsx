import { useEffect, useMemo, useState } from 'react'
import { Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS } from '@/constants'
import * as employeeService from '@/features/hr/services/employeeService'
import * as trainingService from '@/features/hr/training/trainingService'
import { buildTrainingHoursRows, type TrainingHoursRow } from '../utils/trainingHours'
import type { Employee, Training, TrainingAssignment, TrainingTopic } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

const COLUMNS: ReportTableColumn<TrainingHoursRow>[] = [
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Department', value: (r) => r.departmentName },
  { header: 'Trainings Completed', value: (r) => String(r.completedCount), align: 'right' },
  { header: 'Total Hours', value: (r) => r.totalHours.toFixed(1), align: 'right' },
]

/** Per-employee rollup of completed-training hours, from Training.durationHours. */
export function TrainingHoursReportPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [trainings, setTrainings] = useState<Training[] | null>(null)
  const [assignments, setAssignments] = useState<TrainingAssignment[] | null>(null)
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [outletFilter, setOutletFilter] = useState('')

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])
  useEffect(() => trainingService.subscribeToLegacyTrainings(setTrainings), [])
  useEffect(() => trainingService.subscribeToTrainingTopics(setTopics), [])
  useEffect(() => trainingService.subscribeToAllTrainingAssignments(setAssignments), [])

  const rows = useMemo(() => {
    if (!employees || !trainings || !assignments) return []
    const all = buildTrainingHoursRows(employees, trainings, assignments, topics)
    return outletFilter ? all.filter((r) => r.outletId === outletFilter) : all
  }, [employees, trainings, assignments, topics, outletFilter])

  const outletIds = useMemo(() => Array.from(new Set((employees ?? []).map((e) => e.outletId))).sort(), [employees])

  if (employees === null || trainings === null || assignments === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Training Hours Report</h1>
        <p className="text-sm text-muted-foreground">Completed training hours, per employee.</p>
      </div>

      <Select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} aria-label="Filter by outlet">
        <option value="">All outlets</option>
        {outletIds.map((id) => (
          <option key={id} value={id}>
            {OUTLET_NAMES[id] ?? id}
          </option>
        ))}
      </Select>

      {rows.length === 0 ? (
        <EmptyState title="No completed training yet" />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.employeeId} />
      )}
    </div>
  )
}
