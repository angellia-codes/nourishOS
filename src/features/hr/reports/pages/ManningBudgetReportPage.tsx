import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS } from '@/constants'
import { formatCurrency } from '@/utils'
import * as employeeService from '@/features/hr/services/employeeService'
import * as recruitmentService from '@/features/recruitment/recruitmentService'
import * as payrollService from '@/features/hr/payroll/payrollService'
import * as revenueService from '@/features/hr/payroll/revenueService'
import { buildManningBudgetRows, buildSeasonalActualRows } from '../utils/manningBudget'
import type { Employee, Requisition, MonthlyRevenue } from '@/types'
import type { ManningCostSummaryRow } from '@/features/hr/payroll/payrollService'

/** Civil-date, local calendar. */
function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface SeasonalBudgetRow {
  outletId: string
  outletName: string
  departmentId: string
  departmentName: string
  budgetedOpenings: number
  filledCount: number
  gap: number
  activeHeadcount: number
  avgActiveLowSeason: number | null
  avgActiveHighSeason: number | null
}

const BUDGET_COLUMNS: ReportTableColumn<SeasonalBudgetRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Department', value: (r) => r.departmentName },
  { header: 'Budgeted', value: (r) => String(r.budgetedOpenings), align: 'right' },
  { header: 'Filled', value: (r) => String(r.filledCount), align: 'right' },
  { header: 'Gap', value: (r) => String(r.gap), align: 'right' },
  { header: 'Active Now', value: (r) => String(r.activeHeadcount), align: 'right' },
  { header: 'Avg Active (Low Season)', value: (r) => (r.avgActiveLowSeason?.toFixed(1) ?? '—'), align: 'right' },
  { header: 'Avg Active (High Season)', value: (r) => (r.avgActiveHighSeason?.toFixed(1) ?? '—'), align: 'right' },
]

interface CostVsRevenueRow {
  key: string
  outletId: string
  outletName: string
  periodMonth: string
  manningCost: number
  revenue: number | null
  costPercentOfRevenue: number | null
}

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

const COST_COLUMNS: ReportTableColumn<CostVsRevenueRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Month', value: (r) => r.periodMonth },
  { header: 'Manning Cost (Net)', value: (r) => formatCurrency(r.manningCost), align: 'right' },
  { header: 'Revenue', value: (r) => (r.revenue === null ? '—' : formatCurrency(r.revenue)), align: 'right' },
  {
    header: 'Cost as % of Revenue',
    value: (r) => (r.costPercentOfRevenue === null ? '—' : `${r.costPercentOfRevenue.toFixed(1)}%`),
    align: 'right',
  },
]

/**
 * hr.md §16 — budgeted vs actual headcount by season, plus manning cost
 * (payroll-sourced) vs monthly revenue. Manning Cost here is deliberately
 * payroll-sourced, reversing the prior "no compensation data" scope
 * boundary — see src/features/hr/CLAUDE.md. The uniform/asset procurement
 * spend this report used to show moved to the Inventory Cost report.
 */
export function ManningBudgetReportPage() {
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [costSummary, setCostSummary] = useState<ManningCostSummaryRow[] | null>(null)
  const [costDenied, setCostDenied] = useState(false)
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([])

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
    payrollService
      .getManningCostSummary()
      .then(setCostSummary)
      .catch(() => {
        setCostDenied(true)
        setCostSummary([])
      })
  }, [])

  useEffect(() => {
    return revenueService.subscribeToMonthlyRevenue(setRevenue, () => setRevenue([]))
  }, [])

  const asOfIso = useMemo(() => todayIsoLocal(), [])

  const budgetRows: SeasonalBudgetRow[] = useMemo(() => {
    if (!requisitions || !employees) return []
    const budget = buildManningBudgetRows(requisitions, employees)
    const seasonal = buildSeasonalActualRows(employees, asOfIso)

    return budget.map((row) => {
      const key = `${row.outletId}::${row.departmentId}`
      const low = seasonal.find((s) => `${s.outletId}::${s.departmentId}` === key && s.season === 'low')
      const high = seasonal.find((s) => `${s.outletId}::${s.departmentId}` === key && s.season === 'high')
      return {
        ...row,
        avgActiveLowSeason: low?.avgActiveHeadcount ?? null,
        avgActiveHighSeason: high?.avgActiveHeadcount ?? null,
      }
    })
  }, [requisitions, employees, asOfIso])

  const costRows: CostVsRevenueRow[] = useMemo(() => {
    const revenueByKey = new Map(revenue.map((r) => [`${r.outletId}::${r.periodMonth}`, r.amount]))
    return (costSummary ?? []).map((cost) => {
      const key = `${cost.outletId}::${cost.periodMonth}`
      const revenueAmount = revenueByKey.get(key) ?? null
      return {
        key,
        outletId: cost.outletId,
        outletName: OUTLET_NAMES[cost.outletId] ?? cost.outletId,
        periodMonth: cost.periodMonth,
        manningCost: cost.totalNet,
        revenue: revenueAmount,
        costPercentOfRevenue: revenueAmount && revenueAmount > 0 ? (cost.totalNet / revenueAmount) * 100 : null,
      }
    })
  }, [costSummary, revenue])

  if (requisitions === null || employees === null) {
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manning Budget &amp; Cost Report</h1>
        <p className="text-sm text-muted-foreground">
          Budgeted vs actual headcount by season, and manning cost vs monthly revenue.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-foreground">Budget vs Actual, by Season</h2>
        {budgetRows.length === 0 ? (
          <EmptyState title="No budgeted requisitions" description="No approved, budgeted manpower requests yet." />
        ) : (
          <ReportTable columns={BUDGET_COLUMNS} rows={budgetRows} rowKey={(r) => `${r.outletId}::${r.departmentId}`} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-foreground">Manning Cost vs Revenue</h2>
        {costDenied ? (
          <EmptyState
            icon={<Lock className="h-8 w-8" aria-hidden="true" />}
            title="Access restricted"
            description="Manning cost is limited to HR Manager, General Manager, Director and Super Admin."
          />
        ) : costRows.length === 0 ? (
          <EmptyState title="No payroll or revenue data yet" description="Import payroll and record monthly revenue to populate this table." />
        ) : (
          <ReportTable columns={COST_COLUMNS} rows={costRows} rowKey={(r) => r.key} />
        )}
      </div>
    </div>
  )
}
