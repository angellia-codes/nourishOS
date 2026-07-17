import { EMPLOYMENT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/constants/hr'
import type { Employee } from '@/types'

const CSV_COLUMNS: { header: string; value: (employee: Employee) => string }[] = [
  { header: 'Employee Number', value: (e) => e.employeeNumber },
  { header: 'Full Name', value: (e) => e.fullName },
  { header: 'Preferred Name', value: (e) => e.preferredName ?? '' },
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

function escapeCsvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/** HR.md §5 Export feature — one row per employee, in the current list's filter/sort order. */
export function employeesToCsv(employees: Employee[]): string {
  const rows = [
    CSV_COLUMNS.map((c) => c.header),
    ...employees.map((employee) => CSV_COLUMNS.map((c) => escapeCsvCell(c.value(employee)))),
  ]
  return rows.map((row) => row.join(',')).join('\r\n')
}

/** Triggers a browser download of the given CSV text — no backend call, data is already on the client. */
export function downloadCsv(csv: string, fileName: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function exportEmployeesToCsv(employees: Employee[], fileName = 'employees.csv'): void {
  downloadCsv(employeesToCsv(employees), fileName)
}
