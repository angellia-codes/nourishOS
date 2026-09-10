import { OUTLETS, DEPARTMENTS, type OrgOption } from '@/constants/organization'
import { ALL_OUTLETS_ID } from '@/features/hr/payroll/revenueService'
import { employedAsOf } from './turnover'
import { seasonForPeriod, type Season } from './season'
import { MONTH_LABELS } from './workforceOverview'
import type { Employee, MonthlyRevenue, Requisition } from '@/types'
import type { ManningCostSummaryRow } from '@/features/hr/payroll/payrollService'

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

export interface CostRevenueTrendPoint {
  /** 'YYYY-MM'. */
  month: string
  label: string
  manningCost: number
  revenue: number
}

/**
 * Total manning cost (payroll net) against total revenue, month by month —
 * the trend view the Manning Budget & Cost report's own per-outlet table
 * can't give. Both sides are pre-aggregated elsewhere: cost by
 * `getManningCostSummary` (aggregate-only callable — raw payslips stay gated),
 * revenue by the hand-entered `monthlyRevenue` records.
 *
 * The axis is a fixed trailing `months` window ending at `asOfIso`, not the
 * months that happen to have data, so a month nobody has entered yet reads as
 * a dip to zero rather than silently shortening the series.
 *
 * Revenue is the half that can double-count: `ALL_OUTLETS_ID` is a sentinel
 * row holding one company-wide figure (revenueService.ts), and per-outlet rows
 * may exist for the same month. So the company-wide row WINS for a month when
 * it exists, and the per-outlet rows are summed only in its absence — adding
 * both would report revenue twice. Scoped to one outlet, the sentinel row is
 * unusable (it can't be split) and is dropped.
 */
export function buildCostRevenueTrend(
  cost: ManningCostSummaryRow[],
  revenue: MonthlyRevenue[],
  outletId: string,
  asOfIso: string,
  months = 6,
): CostRevenueTrendPoint[] {
  const [asOfYear, asOfMonth] = asOfIso.split('-').map(Number)
  const points: CostRevenueTrendPoint[] = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(asOfYear, asOfMonth - 1 - offset, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const manningCost = cost
      .filter((row) => row.periodMonth === month && (!outletId || row.outletId === outletId))
      .reduce((sum, row) => sum + row.totalNet, 0)

    const monthRevenue = revenue.filter((row) => row.periodMonth === month)
    const companyWide = outletId ? undefined : monthRevenue.find((row) => row.outletId === ALL_OUTLETS_ID)
    const revenueTotal = companyWide
      ? companyWide.amount
      : monthRevenue
          .filter((row) => row.outletId !== ALL_OUTLETS_ID && (!outletId || row.outletId === outletId))
          .reduce((sum, row) => sum + row.amount, 0)

    points.push({ month, label: MONTH_LABELS[date.getMonth()], manningCost, revenue: revenueTotal })
  }

  return points
}

export interface SeasonalActualRow {
  outletId: string
  outletName: string
  departmentId: string
  departmentName: string
  season: Season
  avgActiveHeadcount: number
}

/**
 * §2's "budget vs actual, by season" — the budget side stays a single
 * non-seasonal figure (a requisition carries no month dimension, and adding
 * one is out of scope), only the ACTUAL headcount side is season-bucketed:
 * for each of the trailing `months` month-ends, active headcount per
 * outlet+department is computed and averaged within whichever season that
 * month falls in.
 */
export function buildSeasonalActualRows(employees: Employee[], asOfIso: string, months = 12): SeasonalActualRow[] {
  const [asOfYear, asOfMonth] = asOfIso.split('-').map(Number)
  const buckets = new Map<string, { season: Season; headcounts: number[] }>()

  for (let i = 0; i < months; i++) {
    const date = new Date(asOfYear, asOfMonth - 1 - i, 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const monthEndIso = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
    const periodMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const season = seasonForPeriod(periodMonth)

    const countsByGroup = new Map<string, number>()
    for (const employee of employees) {
      if (!employedAsOf(employee, monthEndIso)) continue
      const key = `${employee.outletId}::${employee.departmentId}`
      countsByGroup.set(key, (countsByGroup.get(key) ?? 0) + 1)
    }

    for (const [key, count] of countsByGroup) {
      const bucketKey = `${key}::${season}`
      let bucket = buckets.get(bucketKey)
      if (!bucket) {
        bucket = { season, headcounts: [] }
        buckets.set(bucketKey, bucket)
      }
      bucket.headcounts.push(count)
    }
  }

  return Array.from(buckets.entries())
    .map(([bucketKey, bucket]) => {
      const [outletId, departmentId] = bucketKey.split('::')
      return {
        outletId,
        outletName: labelFor(outletId, OUTLETS),
        departmentId,
        departmentName: labelFor(departmentId, DEPARTMENTS),
        season: bucket.season,
        avgActiveHeadcount: bucket.headcounts.reduce((sum, n) => sum + n, 0) / bucket.headcounts.length,
      }
    })
    .sort((a, b) => a.outletName.localeCompare(b.outletName) || a.departmentName.localeCompare(b.departmentName))
}
