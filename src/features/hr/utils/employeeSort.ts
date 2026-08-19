import { DISCIPLINARY_TYPE_RANK } from '@/constants/hr'
import type { Employee } from '@/types'

export const EMPLOYEE_SORT_FIELDS = {
  NAME: 'name',
  EMPLOYEE_NUMBER: 'employeeNumber',
  JOIN_DATE: 'joinDate',
  BIRTH_DATE: 'birthDate',
  DEPARTMENT: 'department',
  OUTLET: 'outlet',
  DISCIPLINARY_ACTION: 'disciplinaryAction',
} as const

export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[keyof typeof EMPLOYEE_SORT_FIELDS]

export const EMPLOYEE_SORT_LABELS: Record<EmployeeSortField, string> = {
  name: 'Name (A–Z)',
  employeeNumber: 'Employee Number',
  joinDate: 'Join Date (Newest)',
  birthDate: 'Birth Date',
  department: 'Department',
  outlet: 'Outlet',
  disciplinaryAction: 'Disciplinary Action (Most Severe)',
}

const COMPARATORS: Record<EmployeeSortField, (a: Employee, b: Employee) => number> = {
  name: (a, b) => a.fullName.localeCompare(b.fullName),
  employeeNumber: (a, b) => a.employeeNumber.localeCompare(b.employeeNumber),
  joinDate: (a, b) => b.joinDate.localeCompare(a.joinDate),
  birthDate: (a, b) => a.birthDate.localeCompare(b.birthDate),
  department: (a, b) => a.departmentId.localeCompare(b.departmentId) || a.fullName.localeCompare(b.fullName),
  outlet: (a, b) => a.outletId.localeCompare(b.outletId) || a.fullName.localeCompare(b.fullName),
  disciplinaryAction: (a, b) => {
    const rankA = a.disciplinaryType ? DISCIPLINARY_TYPE_RANK[a.disciplinaryType] : 0
    const rankB = b.disciplinaryType ? DISCIPLINARY_TYPE_RANK[b.disciplinaryType] : 0
    return rankB - rankA || a.fullName.localeCompare(b.fullName)
  },
}

export function sortEmployees(employees: Employee[], field: EmployeeSortField): Employee[] {
  return [...employees].sort(COMPARATORS[field])
}
