import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { formatCurrency } from '@/utils'
import * as employeeService from '@/features/hr/services/employeeService'
import * as recruitmentService from '@/features/hr/recruitment/recruitmentService'
import * as inventoryService from '@/features/hr/inventory/inventoryService'
import { buildManningBudgetRows } from '../utils/manningBudget'
import { buildManningCostRows } from '../utils/manningCost'
import type { Employee, Requisition, StockMovement } from '@/types'

interface CombinedRow {
  outletId: string
  outletName: string
  budgetedOpenings: number
  filledCount: number
  gap: number
  activeHeadcount: number
  totalCost: number
}

function combine(requisitions: Requisition[], employees: Employee[], movements: StockMovement[]): CombinedRow[] {
  const budget = new Map<string, CombinedRow>()
  for (const row of buildManningBudgetRows(requisitions, employees)) {
    const existing = budget.get(row.outletId)
    if (existing) {
      existing.budgetedOpenings += row.budgetedOpenings
      existing.filledCount += row.filledCount
      existing.gap += row.gap
      existing.activeHeadcount += row.activeHeadcount
    } else {
      budget.set(row.outletId, {
        outletId: row.outletId,
        outletName: row.outletName,
        budgetedOpenings: row.budgetedOpenings,
        filledCount: row.filledCount,
        gap: row.gap,
        activeHeadcount: row.activeHeadcount,
        totalCost: 0,
      })
    }
  }
  for (const cost of buildManningCostRows(movements)) {
    const existing = budget.get(cost.outletId)
    if (existing) {
      existing.totalCost = cost.totalCost
    } else {
      budget.set(cost.outletId, {
        outletId: cost.outletId,
        outletName: cost.outletName,
        budgetedOpenings: 0,
        filledCount: 0,
        gap: 0,
        activeHeadcount: 0,
        totalCost: cost.totalCost,
      })
    }
  }
  return Array.from(budget.values()).sort((a, b) => a.outletName.localeCompare(b.outletName))
}

const COLUMNS: ReportTableColumn<CombinedRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Budgeted Openings', value: (r) => String(r.budgetedOpenings), align: 'right' },
  { header: 'Filled', value: (r) => String(r.filledCount), align: 'right' },
  { header: 'Gap', value: (r) => String(r.gap), align: 'right' },
  { header: 'Active Headcount', value: (r) => String(r.activeHeadcount), align: 'right' },
  { header: 'Manning Cost', value: (r) => formatCurrency(r.totalCost), align: 'right' },
]

/** Manning Budget and Manning Cost side by side, per outlet — reuses both reports' aggregators. */
export function BudgetAndCostReportPage() {
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [movements, setMovements] = useState<StockMovement[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return recruitmentService.subscribeToRequisitions(
      (next) => {
        setDenied(false)
        setRequisitions(next)
      },
      () => {
        setDenied(true)
        setRequisitions([])
      },
    )
  }, [])

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  useEffect(() => {
    return inventoryService.subscribeToAllStockMovements(setMovements)
  }, [])

  const rows = useMemo(
    () => combine(requisitions ?? [], employees ?? [], movements ?? []),
    [requisitions, employees, movements],
  )

  if (requisitions === null || employees === null || movements === null) {
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
          description="Your role can't view manpower requests, which this report is built from."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Budget and Cost Report</h1>
        <p className="text-sm text-muted-foreground">
          Manning budget and uniform/asset manning cost, by outlet. Manning cost is procurement spend, not payroll.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No data yet" description="No budgeted requisitions or stock spend recorded." />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.outletId} />
      )}
    </div>
  )
}
