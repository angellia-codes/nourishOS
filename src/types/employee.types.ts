import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { ContractType, EmployeeActivityType, EmploymentStatus, Gender } from '@/constants/hr'

/**
 * Employee master record — HR.md §5, HR_OPERATIONS.md §8 M01 / §11.1.
 * This is the SHIPPED shape: it matches exactly what
 * functions/src/hr/employees/createEmployee.ts writes to Firestore today.
 *
 * Calendar dates (birth, join, contract, resignation) are stored as
 * 'YYYY-MM-DD' strings, not Timestamps: they are civil dates with no
 * time-of-day, and Timestamps would shift across timezones.
 *
 * Deliberately absent: salary/allowance fields. HR_OPERATIONS.md NFR-SE04
 * restricts salary to HR and Super Admin only, but this document is readable
 * by GM/Director/department leaders and Firestore rules cannot hide
 * individual fields — compensation belongs in its own restricted collection
 * when payroll lands (see EmployeeCompensation below).
 */
export interface Employee extends BaseDocument {
  /** Auto-generated server-side: N-0001 / DW-0001 / OJT-0001 (HR_OPERATIONS.md M01-F02). */
  employeeNumber: string

  // Personal
  fullName: string
  preferredName?: string | null
  gender: Gender
  birthDate: string
  /** KTP number (NIK). */
  nationalId?: string | null
  /** NPWP. */
  taxNumber?: string | null
  religion?: string | null
  phone: string
  email: string
  address?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null

  // Employment
  position: string
  departmentId: string
  outletId: string
  /** Employee doc ID of the reporting manager. */
  managerId?: string | null
  employmentStatus: EmploymentStatus
  joinDate: string
  probationMonths: number
  /** Auto-calculated server-side: joinDate + probationMonths. Null for statuses without probation. */
  probationEndDate: string | null

  // Contract
  contractType: ContractType
  contractStartDate?: string | null
  /** Required for fixed-term contracts — drives the expiring-soon flag (M01-F10). */
  contractEndDate?: string | null

  // Separation — set by archiveEmployee only (E01-US03)
  resignationDate?: string | null
  resignationReason?: string | null

  /** Overrides BaseDocument's generic status: 'active' | 'inactive'. */
  status: 'active' | 'inactive'
}

/**
 * One entry on an employee's chronological timeline (HR.md §13).
 * Written only by Cloud Functions alongside the mutation that caused it.
 */
export interface EmployeeActivity extends BaseDocument {
  employeeId: string
  activityType: EmployeeActivityType
  /** Human-readable summary, e.g. "Hired as Barista at Berawa". */
  description: string
}

// ---------------------------------------------------------------------------
// PLANNED — HR & Operations PRD §12.1 / BUILD_ROADMAP.md Part B (Employee
// Master Database). Nothing below is written to Firestore yet; when that
// module lands, the shipped Employee shape above is extended/superseded per
// the plan. Kept here so the domain vocabulary is reviewed and stable ahead
// of implementation. Do NOT use these in shipped code paths yet.
// ---------------------------------------------------------------------------

export type ProbationStatus = 'pending' | 'passed' | 'failed' | 'extended'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

/**
 * PRD §12.1 lists hindu/christian/muslim only, reflecting current Bali
 * outlet staff composition. Flagging rather than silently expanding —
 * confirm with HR before this becomes the enforced enum long-term.
 */
export type Religion = 'hindu' | 'christian' | 'muslim'

/** Indonesian personal income tax (PPh21) status codes. */
export type TaxStatus = 'TK0' | 'TK1' | 'TK2' | 'TK3' | 'K0' | 'K1' | 'K2' | 'K3'

export type DisciplinaryType = 'coaching' | 'verbalWarning' | 'SP1' | 'SP2' | 'SP3' | 'termination'

/**
 * Sub-collection at employees/{employeeId}/compensation/current — split out
 * from Employee per the field-level-security decision (NFR-SE04). Only one
 * live document ("current") per employee; history is covered by auditLogs,
 * not a version array here.
 */
export interface EmployeeCompensation {
  basicSalary: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
  bankAccountName?: string
  bankAccountNumber?: string
  updatedAt: Timestamp
  updatedBy: string
}
