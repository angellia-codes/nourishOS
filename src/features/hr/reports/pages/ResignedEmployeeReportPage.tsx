import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Input, Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { DEPARTMENTS, OUTLETS } from '@/constants'
import { POSITION_LABELS } from '@/constants/positions'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csv'
import * as employeeService from '@/features/hr/services/employeeService'
import type { Employee } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

const CSV_COLUMNS: CsvColumn<Employee>[] = [
  { header: 'Employee Number', value: (e) => e.employeeNumber },
  { header: 'Name', value: (e) => e.fullName },
  { header: 'Position', value: (e) => POSITION_LABELS[e.position as keyof typeof POSITION_LABELS] ?? e.position },
  { header: 'Department', value: (e) => DEPARTMENT_NAMES[e.departmentId] ?? e.departmentId },
  { header: 'Outlet', value: (e) => OUTLET_NAMES[e.outletId] ?? e.outletId },
  { header: 'Join Date', value: (e) => e.joinDate },
  { header: 'Resignation Date', value: (e) => e.resignationDate ?? '' },
  { header: 'Resignation Reason', value: (e) => e.resignationReason ?? '' },
]

const COLUMNS: ReportTableColumn<Employee>[] = CSV_COLUMNS.map((c) => ({ header: c.header, value: c.value }))

/** hr.md §16 "Employee Turn Over" support report — the separation log itself. */
export function ResignedEmployeeReportPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [outletFilter, setOutletFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const resigned = useMemo(
    () => (employees ?? []).filter((e) => e.status === 'inactive' && e.resignationDate),
    [employees],
  )

  const filtered = useMemo(
    () =>
      resigned.filter((e) => {
        if (outletFilter && e.outletId !== outletFilter) return false
        if (departmentFilter && e.departmentId !== departmentFilter) return false
        if (fromDate && (e.resignationDate ?? '') < fromDate) return false
        if (toDate && (e.resignationDate ?? '') > toDate) return false
        return true
      }),
    [resigned, outletFilter, departmentFilter, fromDate, toDate],
  )

  const outletIds = useMemo(() => Array.from(new Set(resigned.map((e) => e.outletId))).sort(), [resigned])
  const departmentIds = useMemo(() => Array.from(new Set(resigned.map((e) => e.departmentId))).sort(), [resigned])

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
          <h1 className="text-xl font-semibold text-foreground">Resigned Employee Report</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {resigned.length} separations
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => downloadCsv(toCsv(filtered, CSV_COLUMNS), 'resigned-employees.csv')}
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Resigned from" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Resigned to" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No separations" description="No resigned employees match these filters." />
      ) : (
        <ReportTable columns={COLUMNS} rows={filtered} rowKey={(e) => e.id} />
      )}
    </div>
  )
}
