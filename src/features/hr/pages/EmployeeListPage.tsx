import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Plus, Search } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardContent, Input, Select, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/hr'
import * as employeeService from '@/features/hr/services/employeeService'
import { exportEmployeesToCsv } from '@/features/hr/utils/employeeExport'
import { isContractExpiringSoon, isProbationEndingSoon } from '@/features/hr/utils/employeeIndicators'
import { EMPLOYEE_SORT_FIELDS, EMPLOYEE_SORT_LABELS, sortEmployees, type EmployeeSortField } from '@/features/hr/utils/employeeSort'
import type { Employee } from '@/types'

type ActiveFilter = 'active' | 'inactive' | 'all'

/**
 * Employee Database list — HR.md §5, HR_OPERATIONS.md §9.1. Search and
 * filters are cumulative and run client-side over one live subscription
 * (E01-US02: results update as you type, no reload).
 */
export function EmployeeListPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [search, setSearch] = useState('')
  const [outletFilter, setOutletFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ActiveFilter>('active')
  const [sortField, setSortField] = useState<EmployeeSortField>(EMPLOYEE_SORT_FIELDS.NAME)

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  const outletIds = useMemo(
    () => Array.from(new Set((employees ?? []).map((e) => e.outletId))).sort(),
    [employees],
  )
  const departmentIds = useMemo(
    () => Array.from(new Set((employees ?? []).map((e) => e.departmentId))).sort(),
    [employees],
  )

  const filtered = useMemo(() => {
    if (!employees) return []
    const term = search.trim().toLowerCase()
    const matches = employees.filter((employee) => {
      if (statusFilter !== 'all' && employee.status !== statusFilter) return false
      if (outletFilter && employee.outletId !== outletFilter) return false
      if (departmentFilter && employee.departmentId !== departmentFilter) return false
      if (term.length >= 2) {
        const haystack = [employee.fullName, employee.preferredName ?? '', employee.employeeNumber, employee.position]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
    return sortEmployees(matches, sortField)
  }, [employees, search, outletFilter, departmentFilter, statusFilter, sortField])

  if (employees === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {employees.length} records
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEES_EXPORT}>
            <Button variant="secondary" onClick={() => exportEmployeesToCsv(filtered, 'employees.csv')}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Export
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.EMPLOYEES_CREATE}>
            <Button onClick={() => navigate('/hr/employees/new')}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add Employee
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters — cumulative (E01-US02) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, number, position…"
            className="pl-9"
            aria-label="Search employees"
          />
        </div>
        <Select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} aria-label="Filter by outlet">
          <option value="">All outlets</option>
          {outletIds.map((id) => (
            <option key={id} value={id}>
              {id}
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
              {id}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ActiveFilter)}
          aria-label="Filter by status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All statuses</option>
        </Select>
        <Select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as EmployeeSortField)}
          aria-label="Sort employees"
        >
          {Object.values(EMPLOYEE_SORT_FIELDS).map((field) => (
            <option key={field} value={field}>
              Sort: {EMPLOYEE_SORT_LABELS[field]}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={employees.length === 0 ? 'No employees yet' : 'No employees match these filters'}
          description={
            employees.length === 0
              ? 'Add the first employee record to start the database.'
              : 'Try clearing the search or widening the filters.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((employee) => (
            <Link key={employee.id} to={`/hr/employees/${employee.id}`}>
              <Card className="cursor-pointer transition-colors duration-150 hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={employee.fullName} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{employee.fullName}</p>
                      <span className="text-xs text-muted-foreground">{employee.employeeNumber}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.position} &middot; {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]} &middot;{' '}
                      {employee.outletId}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {employee.status === 'inactive' && <Badge variant="neutral">Inactive</Badge>}
                    {isProbationEndingSoon(employee) && <Badge variant="warning">Probation ending</Badge>}
                    {isContractExpiringSoon(employee) && <Badge variant="error">Contract expiring</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
