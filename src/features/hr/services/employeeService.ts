import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ContractType, DisciplinaryType, EmploymentStatus, Gender, ProbationStatus, Religion, TaxStatus } from '@/constants/hr'
import type { Employee, EmployeeActivity, EmployeeCompensation } from '@/types'
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
  permanentAddress?: string
  domicileAddress?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  motherName?: string
  bpjsTk?: string
  bpjsKesehatan?: string
  personalTaxStatus?: TaxStatus
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
  updates: Partial<CreateEmployeeInput> & { managerId?: string | null; probationStatus?: ProbationStatus | null },
): Promise<{ employeeId: string }> {
  return callFunction('updateEmployee', { employeeId, updates })
}

/**
 * Soft-delete (E01-US03) — resignation date, reason and last working date are
 * mandatory server-side. Also the offboarding trigger: the returned
 * offboardingChecklistId is employee-onboarding-exit-checklist.md §5's OUT
 * checklist, generated in the same call.
 */
export function archiveEmployee(
  employeeId: string,
  resignationDate: string,
  resignationReason: string,
  lastWorkingDate: string,
): Promise<{ employeeId: string; offboardingChecklistId: string }> {
  return callFunction('archiveEmployee', { employeeId, resignationDate, resignationReason, lastWorkingDate })
}

export function getEmployee(employeeId: string): Promise<Employee | null> {
  return getDocument<Employee>(COLLECTIONS.EMPLOYEES, employeeId)
}

export interface UpdateEmployeeCompensationInput {
  basicSalary: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
  bankAccountName?: string
  bankAccountNumber?: string
}

/** §12.1 — hrManager/superAdmin only; firestore.rules gates the read half. */
export function updateEmployeeCompensation(employeeId: string, input: UpdateEmployeeCompensationInput): Promise<void> {
  return callFunction('updateEmployeeCompensation', { employeeId, ...input })
}

export function getEmployeeCompensation(employeeId: string): Promise<EmployeeCompensation | null> {
  return getDocument<EmployeeCompensation>(`${COLLECTIONS.EMPLOYEES}/${employeeId}/compensation`, 'current')
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
