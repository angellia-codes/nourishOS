import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ContractType, DisciplinaryType, EmploymentStatus, Gender, Religion } from '@/constants/hr'
import type { Employee, EmployeeActivity } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface CreateEmployeeInput {
  fullName: string
  gender: Gender
  birthDate: string
  nationalId?: string
  taxNumber?: string
  religion?: Religion
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
  disciplinaryType?: DisciplinaryType
  disciplinaryStartPeriod?: string
  disciplinaryEndPeriod?: string
  recognitionType?: string
  recognitionPeriod?: string
  /**
   * Set when the form was opened from an onboarding checklist
   * (/hr/employees/new?candidateId=…). The server links the new employee back
   * to the candidate and its checklist.
   */
  candidateId?: string
}

export interface CreateEmployeeResult {
  employeeId: string
  /** Server-allocated, e.g. "N-0042" — never chosen by the client. */
  employeeNumber: string
}

export function createEmployee(input: CreateEmployeeInput): Promise<CreateEmployeeResult> {
  return callFunction('createEmployee', input)
}

export interface ImportEmployeeRowResult {
  index: number
  success: boolean
  employeeId?: string
  employeeNumber?: string
  error?: string
}

/** Bulk create — HR_OPERATIONS.md §9.1-F12. Partial success: a bad row is reported, not thrown. */
export function importEmployees(rows: CreateEmployeeInput[]): Promise<{ results: ImportEmployeeRowResult[] }> {
  return callFunction('importEmployees', { rows })
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

export interface EmployeeAuditLogEntry {
  id: string
  timestamp: string
  eventType: string
  action: string
  userName: string
  previousValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
}

/** auditLogs is closed to direct client reads — this is the one narrow, read-only exception (9.1-F07/F15). */
export function getEmployeeAuditLog(employeeId: string): Promise<{ entries: EmployeeAuditLogEntry[] }> {
  return callFunction('getEmployeeAuditLog', { employeeId })
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

/** Cross-employee activity feed for the Employee Activity report — same scale reasoning as subscribeToEmployees. */
export function subscribeToAllEmployeeActivities(
  onChange: (activities: EmployeeActivity[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<EmployeeActivity>(
    COLLECTIONS.EMPLOYEE_ACTIVITIES,
    [orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
