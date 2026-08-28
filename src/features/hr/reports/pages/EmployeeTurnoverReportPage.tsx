import { useEffect, useMemo, useState } from 'react'
import { UserCheck, UserMinus } from 'lucide-react'
import { Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, MetricTile, type ReportTableColumn } from '@/components/shared'
import { OUTLETS } from '@/constants'
import * as employeeService from '@/features/hr/services/employeeService'
import { buildTurnoverRows, type TurnoverRow } from '../utils/turnover'
import type { Employee } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

/** Civil-date, local calendar — never toISOString/UTC (CLAUDE.md WITA gotcha). */
function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const COLUMNS: ReportTableColumn<TurnoverRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Department', value: (r) => r.departmentName },
  { header: 'Active', value: (r) => String(r.activeCount), align: 'right' },
  { header: 'Resigned (MTD)', value: (r) => String(r.resignedMtd), align: 'right' },
  { header: 'Rate (MTD)', value: (r) => `${(r.turnoverRateMtd * 100).toFixed(1)}%`, align: 'right' },
  { header: 'Resigned (YTD)', value: (r) => String(r.resignedYtd), align: 'right' },
  { header: 'Rate (YTD)', value: (r) => `${(r.turnoverRateYtd * 100).toFixed(1)}%`, align: 'right' },
]

/** hr.md §16 "Employee Turn Over" — active/resigned totals plus MTD/YTD turnover, by outlet and department. */
export function EmployeeTurnoverReportPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [outletFilter, setOutletFilter] = useState('')

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const scoped = useMemo(
    () => (employees ?? []).filter((e) => !outletFilter || e.outletId === outletFilter),
    [employees, outletFilter],
  )

  const outletIds = useMemo(() => Array.from(new Set((employees ?? []).map((e) => e.outletId))).sort(), [employees])

  const asOfIso = useMemo(() => todayIsoLocal(), [])
  const rows = useMemo(() => buildTurnoverRows(scoped, asOfIso), [scoped, asOfIso])

  const totalActive = useMemo(() => scoped.filter((e) => e.status === 'active').length, [scoped])
  const totalResigned = useMemo(
    () => scoped.filter((e) => e.status === 'inactive' && e.resignationDate).length,
    [scoped],
  )

  if (employees === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Employee Turnover Report</h1>
        <p className="text-sm text-muted-foreground">
          Total active and resigned, plus month-to-date and year-to-date turnover, by outlet and department.
        </p>
      </div>

      <Select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} aria-label="Filter by outlet">
        <option value="">All outlets</option>
        {outletIds.map((id) => (
          <option key={id} value={id}>
            {OUTLET_NAMES[id] ?? id}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricTile label="Total Active" value={totalActive} icon={UserCheck} />
        <MetricTile label="Total Resigned" value={totalResigned} icon={UserMinus} />
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => `${r.outletId}::${r.departmentId}`} />
      )}
    </div>
  )
}
