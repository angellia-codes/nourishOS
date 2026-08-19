import { useEffect, useMemo, useState } from 'react'
import { FileSignature } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import * as employeeService from '@/features/hr/services/employeeService'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { Employee } from '@/types'

const MAX_ROWS = 5
/** §9.9's HR widget pair: contract renewals due in 60 days, probation reviews due in 30. */
const CONTRACT_HORIZON_DAYS = 60
const PROBATION_HORIZON_DAYS = 30

function isoDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

interface DueRow {
  employee: Employee
  kind: 'contract' | 'probation'
  date: string
}

/**
 * HR_OPERATIONS.md §9.9 — "Contract Renewals Due (60d)" and "Probation Reviews
 * Due (30d)" as one widget: they share a source, a route and an urgency rule,
 * and two half-empty cards read worse than one list.
 *
 * Alert logic per §9.9: red once inside the doc's tighter window (contracts
 * < 30 days, probation < 14). Reuses the existing unfiltered employee
 * subscription, so no new query shape and no index.
 */
export function ContractRenewalsDueWidget() {
  const [employees, setEmployees] = useState<Employee[] | null>(null)

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const rows = useMemo(() => {
    const today = isoDaysFromNow(0)
    const contractCutoff = isoDaysFromNow(CONTRACT_HORIZON_DAYS)
    const probationCutoff = isoDaysFromNow(PROBATION_HORIZON_DAYS)

    const due: DueRow[] = []
    for (const employee of employees ?? []) {
      if (employee.status !== 'active') continue
      if (employee.contractEndDate && employee.contractEndDate >= today && employee.contractEndDate <= contractCutoff) {
        due.push({ employee, kind: 'contract', date: employee.contractEndDate })
      }
      if (
        employee.probationEndDate &&
        employee.probationEndDate >= today &&
        employee.probationEndDate <= probationCutoff
      ) {
        due.push({ employee, kind: 'probation', date: employee.probationEndDate })
      }
    }
    return due.sort((a, b) => a.date.localeCompare(b.date))
  }, [employees])

  return (
    <DashboardWidget
      title="Contracts & Probations Due"
      icon={FileSignature}
      count={employees === null ? undefined : rows.length}
      viewAllTo="/hr/employees"
      loading={employees === null}
      emptyText="Nothing falling due in the next 60 days."
    >
      <div className="flex flex-col gap-2">
        {rows.slice(0, MAX_ROWS).map((row) => {
          const urgent = row.kind === 'contract' ? row.date <= isoDaysFromNow(30) : row.date <= isoDaysFromNow(14)
          return (
            <WidgetRow key={`${row.employee.id}-${row.kind}`} to={`/hr/employees/${row.employee.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{row.employee.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {row.kind === 'contract' ? 'Contract ends' : 'Probation ends'} {row.date}
                </p>
              </div>
              <StatusPill tone={urgent ? 'error' : 'warning'} label={urgent ? 'Urgent' : 'Upcoming'} icon={FileSignature} />
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
