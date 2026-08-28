import { useEffect, useMemo, useState } from 'react'
import { Download, GraduationCap, ScrollText, UserCheck, Users } from 'lucide-react'
import { Button, Select, Spinner } from '@/components/ui'
import { EmptyState, MetricTile, ReportTable, type ReportTableColumn } from '@/components/shared'
import { DEPARTMENTS, OUTLETS } from '@/constants'
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/hr'
import { POSITION_LABELS } from '@/constants/positions'
import * as employeeService from '@/features/hr/services/employeeService'
import { exportEmployeesToCsv } from '@/features/hr/utils/employeeExport'
import { formatTenure } from '@/features/hr/utils/employeeIndicators'
import { buildEmploymentStatusBreakdown } from '@/features/hr/reports/utils/employmentStatusBreakdown'
import type { Employee } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

const COLUMNS: ReportTableColumn<Employee>[] = [
  { header: 'Employee Number', value: (e) => e.employeeNumber },
  { header: 'Name', value: (e) => e.fullName },
  { header: 'Position', value: (e) => POSITION_LABELS[e.position as keyof typeof POSITION_LABELS] ?? e.position },
  { header: 'Department', value: (e) => DEPARTMENT_NAMES[e.departmentId] ?? e.departmentId },
  { header: 'Outlet', value: (e) => OUTLET_NAMES[e.outletId] ?? e.outletId },
  { header: 'Employment Status', value: (e) => EMPLOYMENT_STATUS_LABELS[e.employmentStatus] },
  { header: 'Join Date', value: (e) => e.joinDate },
  { header: 'Tenure', value: (e) => formatTenure(e.joinDate) },
]

/** hr.md §16 "Employee List" / "Headcount" — the current active roster. */
export function ActiveEmployeeReportPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [outletFilter, setOutletFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const active = useMemo(() => (employees ?? []).filter((e) => e.status === 'active'), [employees])

  const filtered = useMemo(
    () =>
      active.filter((e) => {
        if (outletFilter && e.outletId !== outletFilter) return false
        if (departmentFilter && e.departmentId !== departmentFilter) return false
        return true
      }),
    [active, outletFilter, departmentFilter],
  )

  const outletIds = useMemo(() => Array.from(new Set(active.map((e) => e.outletId))).sort(), [active])
  const departmentIds = useMemo(() => Array.from(new Set(active.map((e) => e.departmentId))).sort(), [active])

  const breakdown = useMemo(() => buildEmploymentStatusBreakdown(filtered), [filtered])

  if (employees === null) {
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
          <h1 className="text-xl font-semibold text-foreground">Active Employee Report</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {active.length} active employees
          </p>
        </div>
        <Button variant="secondary" onClick={() => exportEmployeesToCsv(filtered, 'active-employees.csv')}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Export
        </Button>
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
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departmentIds.map((id) => (
            <option key={id} value={id}>
              {DEPARTMENT_NAMES[id] ?? id}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="PKWT + PKWTT" value={breakdown.pkwtCombined} icon={Users} />
        <MetricTile label="Daily Worker" value={breakdown.dailyWorker} icon={UserCheck} />
        {breakdown.ojt > 0 && <MetricTile label="On-the-Job Training" value={breakdown.ojt} icon={GraduationCap} />}
        {breakdown.other > 0 && <MetricTile label="Other" value={breakdown.other} icon={ScrollText} />}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No active employees" description="No records match these filters." />
      ) : (
        <ReportTable columns={COLUMNS} rows={filtered} rowKey={(e) => e.id} />
      )}
    </div>
  )
}
