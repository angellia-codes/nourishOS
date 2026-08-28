import { OUTLETS, DEPARTMENTS, type OrgOption } from '@/constants/organization'
import type { Employee, Training, TrainingAssignment, TrainingTopic } from '@/types'

export interface TrainingHoursRow {
  employeeId: string
  employeeName: string
  outletId: string
  outletName: string
  departmentId: string
  departmentName: string
  completedCount: number
  totalHours: number
}

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

/**
 * Per-employee rollup of completed training time.
 *
 * Two shapes feed this: canonical assignments carry `topicId` and price off
 * the topic's `durationMinutes` (training-module-spec-v1.0.md §4.2), while
 * rows written before 2026-08-26 carry `trainingId` and price off the retired
 * flat catalogue's `durationHours`. Neither is rewritten, so both paths stay —
 * an unpriceable row contributes 0 hours, not a crash.
 */
export function buildTrainingHoursRows(
  employees: Employee[],
  trainings: Training[],
  assignments: TrainingAssignment[],
  topics: TrainingTopic[] = [],
): TrainingHoursRow[] {
  const trainingById = new Map(trainings.map((t) => [t.id, t]))
  const topicById = new Map(topics.map((topic) => [topic.id, topic]))
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const rows = new Map<string, TrainingHoursRow>()

  for (const assignment of assignments) {
    if (assignment.status !== 'completed') continue
    const employee = employeeById.get(assignment.employeeId)
    if (!employee) continue
    const hours = assignment.topicId
      ? (topicById.get(assignment.topicId)?.durationMinutes ?? 0) / 60
      : (assignment.trainingId ? trainingById.get(assignment.trainingId)?.durationHours : 0) ?? 0

    let row = rows.get(employee.id)
    if (!row) {
      row = {
        employeeId: employee.id,
        employeeName: employee.fullName,
        outletId: employee.outletId,
        outletName: labelFor(employee.outletId, OUTLETS),
        departmentId: employee.departmentId,
        departmentName: labelFor(employee.departmentId, DEPARTMENTS),
        completedCount: 0,
        totalHours: 0,
      }
      rows.set(employee.id, row)
    }
    row.completedCount += 1
    row.totalHours += hours
  }

  return Array.from(rows.values()).sort((a, b) => b.totalHours - a.totalHours)
}
