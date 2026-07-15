import type { BaseDocument } from './firestore.types'
import type { ContractType, EmployeeActivityType, EmploymentStatus, Gender } from '@/constants/hr'

/**
 * Employee master record — HR.md §5, HR_OPERATIONS.md §8 M01 / §11.1.
 *
 * Calendar dates (birth, join, contract, resignation) are stored as
 * 'YYYY-MM-DD' strings, not Timestamps: they are civil dates with no
 * time-of-day, and Timestamps would shift across timezones.
 *
 * Deliberately absent: salary/allowance fields. HR_OPERATIONS.md NFR-SE04
 * restricts salary to HR and Super Admin only, but this document is readable
 * by GM/Director/department leaders and Firestore rules cannot hide
 * individual fields — compensation belongs in its own restricted collection
 * when payroll lands.
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
