import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import * as employeeService from '@/features/hr/services/employeeService'
import * as recruitmentService from '@/features/hr/recruitment/recruitmentService'
import { buildManningBudgetRows, type ManningBudgetRow } from '../utils/manningBudget'
import type { Employee, Requisition } from '@/types'

const COLUMNS: ReportTableColumn<ManningBudgetRow>[] = [
  { header: 'Outlet', value: (r) => r.outletName },
  { header: 'Department', value: (r) => r.departmentName },
  { header: 'Budgeted Openings', value: (r) => String(r.budgetedOpenings), align: 'right' },
  { header: 'Filled', value: (r) => String(r.filledCount), align: 'right' },
  { header: 'Gap', value: (r) => String(r.gap), align: 'right' },
  { header: 'Active Headcount', value: (r) => String(r.activeHeadcount), align: 'right' },
]

/** hr.md §16 — budgeted headcount vs. filled and current active roster, by outlet + department. */
export function ManningBudgetReportPage() {
  const [requisitions, setRequisitions] = useState<Requisition[] | null>(null)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
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

  const rows = buildManningBudgetRows(requisitions, employees)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manning Budget Report</h1>
        <p className="text-sm text-muted-foreground">
          Budgeted, approved requisition headcount against filled and current active headcount.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No budgeted requisitions" description="No approved, budgeted manpower requests yet." />
      ) : (
        <ReportTable columns={COLUMNS} rows={rows} rowKey={(r) => `${r.outletId}::${r.departmentId}`} />
      )}
    </div>
  )
}
