import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csv'
import { EMPLOYMENT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/constants/hr'
import type { Employee } from '@/types'

const CSV_COLUMNS: CsvColumn<Employee>[] = [
  { header: 'Employee Number', value: (e) => e.employeeNumber },
  { header: 'Full Name', value: (e) => e.fullName },
  { header: 'Gender', value: (e) => (e.gender === 'male' ? 'Male' : 'Female') },
  { header: 'Position', value: (e) => e.position },
  { header: 'Department', value: (e) => e.departmentId },
  { header: 'Outlet', value: (e) => e.outletId },
  { header: 'Employment Status', value: (e) => EMPLOYMENT_STATUS_LABELS[e.employmentStatus] },
  { header: 'Contract Type', value: (e) => CONTRACT_TYPE_LABELS[e.contractType] },
  { header: 'Join Date', value: (e) => e.joinDate },
  { header: 'Probation End Date', value: (e) => e.probationEndDate ?? '' },
  { header: 'Contract End Date', value: (e) => e.contractEndDate ?? '' },
  { header: 'Status', value: (e) => e.status },
  { header: 'Phone', value: (e) => e.phone },
  { header: 'Email', value: (e) => e.email },
]

/** HR.md §5 Export feature — one row per employee, in the current list's filter/sort order. */
export function employeesToCsv(employees: Employee[]): string {
  return toCsv(employees, CSV_COLUMNS)
}

export function exportEmployeesToCsv(employees: Employee[], fileName = 'employees.csv'): void {
  downloadCsv(employeesToCsv(employees), fileName)
}
