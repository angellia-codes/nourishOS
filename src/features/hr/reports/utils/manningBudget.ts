import { OUTLETS, DEPARTMENTS, type OrgOption } from '@/constants/organization'
import type { Employee, Requisition } from '@/types'

export interface ManningBudgetRow {
  outletId: string
  outletName: string
  departmentId: string
  departmentName: string
  budgetedOpenings: number
  filledCount: number
  gap: number
  activeHeadcount: number
}

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

/**
 * Groups budgeted requisition headcount (openings/filled) and current active
 * headcount by outlet + department. `vacancyStage !== null` is used rather
 * than `status === 'approved'` so requisitions that later completed (filled)
 * still count toward the budget they were approved against — see
 * recruitment.types.ts on vacancyStage's lifecycle.
 */
export function buildManningBudgetRows(requisitions: Requisition[], employees: Employee[]): ManningBudgetRow[] {
  const groups = new Map<string, ManningBudgetRow>()

  function groupFor(outletId: string, departmentId: string): ManningBudgetRow {
    const key = `${outletId}::${departmentId}`
    let row = groups.get(key)
    if (!row) {
      row = {
        outletId,
        outletName: labelFor(outletId, OUTLETS),
        departmentId,
        departmentName: labelFor(departmentId, DEPARTMENTS),
        budgetedOpenings: 0,
        filledCount: 0,
        gap: 0,
        activeHeadcount: 0,
      }
      groups.set(key, row)
    }
    return row
  }

  for (const requisition of requisitions) {
    if (!requisition.budgeted || requisition.vacancyStage === null) continue
    const row = groupFor(requisition.outletId, requisition.departmentId)
    row.budgetedOpenings += requisition.openings
    row.filledCount += requisition.filledCount
  }

  for (const employee of employees) {
    if (employee.status !== 'active') continue
    const row = groupFor(employee.outletId, employee.departmentId)
    row.activeHeadcount += 1
  }

  for (const row of groups.values()) {
    row.gap = row.budgetedOpenings - row.filledCount
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.outletName.localeCompare(b.outletName) || a.departmentName.localeCompare(b.departmentName),
  )
}
