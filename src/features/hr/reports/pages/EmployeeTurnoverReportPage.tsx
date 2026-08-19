import { useEffect, useMemo, useState } from 'react'
import { Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS } from '@/constants'
import * as employeeService from '@/features/hr/services/employeeService'
import type { Employee } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

interface TurnoverRow {
  label: string
  headcountStart: number
  resignations: number
  headcountEnd: number
  turnoverRate: number
}

/** Civil-date formatter from local calendar fields — never through toISOString/UTC (CLAUDE.md WITA gotcha). */
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthBuckets(count: number): { label: string; start: string; end: string }[] {
  const now = new Date()
  const buckets = []
  for (let i = count - 1; i >= 0; i--) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    buckets.push({
      label: new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(first),
      start: toIsoDate(first),
      end: toIsoDate(last),
    })
  }
  return buckets
}

/** Employed as of the given civil date: joined on or before it, and not resigned before it. */
function employedAsOf(employee: Employee, isoDate: string): boolean {
  if (employee.joinDate > isoDate) return false
  if (employee.resignationDate && employee.resignationDate < isoDate) return false
  return true
}

function buildTurnoverRows(employees: Employee[], months: number): TurnoverRow[] {
  return monthBuckets(months).map(({ label, start, end }) => {
    const headcountStart = employees.filter((e) => employedAsOf(e, start)).length
    const headcountEnd = employees.filter((e) => employedAsOf(e, end)).length
    const resignations = employees.filter(
      (e) => e.resignationDate && e.resignationDate >= start && e.resignationDate <= end,
    ).length
    const avgHeadcount = (headcountStart + headcountEnd) / 2
    return {
      label,
      headcountStart,
      resignations,
      headcountEnd,
      turnoverRate: avgHeadcount > 0 ? resignations / avgHeadcount : 0,
    }
  })
}

const COLUMNS: ReportTableColumn<TurnoverRow>[] = [
  { header: 'Month', value: (r) => r.label },
  { header: 'Headcount (start)', value: (r) => String(r.headcountStart), align: 'right' },
  { header: 'Resignations', value: (r) => String(r.resignations), align: 'right' },
  { header: 'Headcount (end)', value: (r) => String(r.headcountEnd), align: 'right' },
  { header: 'Turnover Rate', value: (r) => `${(r.turnoverRate * 100).toFixed(1)}%`, align: 'right' },
]

/** hr.md §16 "Employee Turn Over" — monthly resignations against average headcount. */
export function EmployeeTurnoverReportPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [outletFilter, setOutletFilter] = useState('')
  const [months, setMonths] = useState(12)

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const scoped = useMemo(
    () => (employees ?? []).filter((e) => !outletFilter || e.outletId === outletFilter),
    [employees, outletFilter],
  )

  const outletIds = useMemo(() => Array.from(new Set((employees ?? []).map((e) => e.outletId))).sort(), [employees])

  const rows = useMemo(() => buildTurnoverRows(scoped, months), [scoped, months])

  if (employees === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Employee Turnover Report</h1>
        <p className="text-sm text-muted-foreground">Turnover rate = resignations ÷ average headcount, per month.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} aria-label="Filter by outlet">
          <option value="">All outlets</option>
          {outletIds.map((id) => (
            <option key={id} value={id}>
              {OUTLET_NAMES[id] ?? id}
            </option>
          ))}
        </Select>
        <Select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Period length">
          <option value={6}>Trailing 6 months</option>
          <option value={12}>Trailing 12 months</option>
          <option value={24}>Trailing 24 months</option>
        </Select>
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.label} />
      )}
    </div>
  )
}
