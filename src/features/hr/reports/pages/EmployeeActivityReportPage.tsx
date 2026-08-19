import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Input, Select, Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { formatDateTime } from '@/utils/date'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csv'
import * as employeeService from '@/features/hr/services/employeeService'
import type { EmployeeActivityType } from '@/constants/hr'
import type { Employee, EmployeeActivity } from '@/types'

const ACTIVITY_TYPE_LABELS: Record<EmployeeActivityType, string> = {
  hired: 'Hired',
  updated: 'Updated',
  archived: 'Archived',
  promoted: 'Promoted',
  departmentTransfer: 'Department Transfer',
  outletTransfer: 'Outlet Transfer',
  disciplinaryWarning: 'Disciplinary Warning',
  appraisalCompleted: 'Performance Review',
  contractRenewed: 'Contract Renewed',
  contractTerminated: 'Contract Terminated',
  trainingCompleted: 'Training Completed',
}

interface ActivityRow extends EmployeeActivity {
  employeeName: string
}

/** hr.md §13 activity timeline, across the whole roster instead of one employee's profile. */
export function EmployeeActivityReportPage() {
  const [activities, setActivities] = useState<EmployeeActivity[] | null>(null)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [typeFilter, setTypeFilter] = useState<EmployeeActivityType | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    return employeeService.subscribeToAllEmployeeActivities(setActivities)
  }, [])

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const employeeNames = useMemo(
    () => Object.fromEntries((employees ?? []).map((e) => [e.id, e.fullName])),
    [employees],
  )

  const rows: ActivityRow[] = useMemo(
    () =>
      (activities ?? [])
        .filter((a) => typeFilter === 'all' || a.activityType === typeFilter)
        .filter((a) => !fromDate || a.createdAt >= fromDate)
        .filter((a) => !toDate || a.createdAt <= `${toDate}T23:59:59`)
        .map((a) => ({ ...a, employeeName: employeeNames[a.employeeId] ?? a.employeeId })),
    [activities, typeFilter, fromDate, toDate, employeeNames],
  )

  const columns: ReportTableColumn<ActivityRow>[] = [
    { header: 'Date', value: (r) => formatDateTime(r.createdAt) },
    { header: 'Employee', value: (r) => r.employeeName },
    { header: 'Activity', value: (r) => ACTIVITY_TYPE_LABELS[r.activityType] },
    { header: 'Description', value: (r) => r.description },
  ]

  const csvColumns: CsvColumn<ActivityRow>[] = [
    { header: 'Date', value: (r) => r.createdAt },
    { header: 'Employee', value: (r) => r.employeeName },
    { header: 'Activity', value: (r) => ACTIVITY_TYPE_LABELS[r.activityType] },
    { header: 'Description', value: (r) => r.description },
  ]

  if (activities === null || employees === null) {
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
          <h1 className="text-xl font-semibold text-foreground">Employee Activity Report</h1>
          <p className="text-sm text-muted-foreground">{rows.length} events</p>
        </div>
        <Button variant="secondary" onClick={() => downloadCsv(toCsv(rows, csvColumns), 'employee-activity.csv')}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EmployeeActivityType | 'all')}
          aria-label="Filter by activity type"
        >
          <option value="all">All activity</option>
          {(Object.keys(ACTIVITY_TYPE_LABELS) as EmployeeActivityType[]).map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No activity" description="No events match these filters." />
      ) : (
        <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      )}
    </div>
  )
}
