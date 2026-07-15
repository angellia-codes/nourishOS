import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ContractType, EmploymentStatus, Gender } from '@/constants/hr'
import type { Employee, EmployeeActivity } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateEmployeeInput {
  fullName: string
  preferredName?: string
  gender: Gender
  birthDate: string
  nationalId?: string
  taxNumber?: string
  religion?: string
  phone: string
  email: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  position: string
  departmentId: string
  outletId: string
  managerId?: string
  employmentStatus: EmploymentStatus
  joinDate: string
  probationMonths: number
  contractType: ContractType
  contractStartDate?: string
  contractEndDate?: string
}

export interface CreateEmployeeResult {
  employeeId: string
  /** Server-allocated, e.g. "N-0042" — never chosen by the client. */
  employeeNumber: string
}

export function createEmployee(input: CreateEmployeeInput): Promise<CreateEmployeeResult> {
  return callFunction('createEmployee', input)
}

/** Server whitelists updatable fields; employeeNumber and separation state are rejected. */
export function updateEmployee(
  employeeId: string,
  updates: Partial<CreateEmployeeInput> & { managerId?: string | null },
): Promise<{ employeeId: string }> {
  return callFunction('updateEmployee', { employeeId, updates })
}

/** Soft-delete (E01-US03) — resignation date and reason are mandatory server-side. */
export function archiveEmployee(
  employeeId: string,
  resignationDate: string,
  resignationReason: string,
): Promise<{ employeeId: string }> {
  return callFunction('archiveEmployee', { employeeId, resignationDate, resignationReason })
}

export function getEmployee(employeeId: string): Promise<Employee | null> {
  return getDocument<Employee>(COLLECTIONS.EMPLOYEES, employeeId)
}

/**
 * Live full roster ordered by name. At the org's scale (~180 heads,
 * HR_OPERATIONS.md NFR-S01 caps design at 500) one subscription + client-side
 * search/filtering comfortably beats the ≤1s search target without composite
 * indexes per filter combination.
 */
export function subscribeToEmployees(onChange: (employees: Employee[]) => void): Unsubscribe {
  return subscribeToCollection<Employee>(COLLECTIONS.EMPLOYEES, [orderBy('fullName', 'asc')], onChange)
}

/** Chronological timeline for one employee's profile (HR.md §13), newest first. */
export function subscribeToEmployeeActivities(
  employeeId: string,
  onChange: (activities: EmployeeActivity[]) => void,
): Unsubscribe {
  return subscribeToCollection<EmployeeActivity>(
    COLLECTIONS.EMPLOYEE_ACTIVITIES,
    [where('employeeId', '==', employeeId), orderBy('createdAt', 'desc')],
    onChange,
  )
}
