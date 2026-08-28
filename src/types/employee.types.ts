import type { BaseDocument } from './firestore.types'
import type {
  ContractType,
  DisciplinaryType,
  EmployeeActivityType,
  EmploymentStatus,
  Gender,
  ProbationStatus,
  Religion,
  TaxStatus,
} from '@/constants/hr'

/**
 * Employee master record — HR.md §5, HR_OPERATIONS.md §9.1 / §12.1.
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
  /** Auto-generated server-side: N-0001 / DW-0001 / OJT-0001 (HR_OPERATIONS.md 9.1-F02). */
  employeeNumber: string
  /**
   * Pre-NourishOS payroll numbering, e.g. '273'. Populated once at migration,
   * null for anyone hired since. payroll-components-payslip-design.md §4.6 —
   * it bridges the old numbering to employeeNumber and is the CSV import
   * cross-check (decision 8). The importer only enforces the cross-check when
   * this is non-null, so a partial backfill does not block the first import.
   */
  legacyEmployeeId?: string | null

  // Personal
  fullName: string
  gender: Gender
  birthDate: string
  /** KTP number (NIK). */
  nationalId?: string | null
  /** NPWP. */
  taxNumber?: string | null
  religion?: Religion | null
  phone: string
  email: string
  /** General-purpose address, predates the KTP/domicile split below — kept as-is for existing records rather than migrated. */
  address?: string | null
  /** §12.1 permanentAddress — as per KTP. */
  permanentAddress?: string | null
  /** §12.1 domicileAddress — current residence, if different from the KTP address. */
  domicileAddress?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  motherName?: string | null
  /** BPJS Ketenagakerjaan membership number. */
  bpjsTk?: string | null
  /** BPJS Kesehatan membership number. */
  bpjsKesehatan?: string | null
  /** PPh21 personal tax status (TK0-3 / K0-3). */
  personalTaxStatus?: TaxStatus | null

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
  /** Defaults to 'pending' at hire; edited on the profile as probation is reviewed. Optional so pre-existing employees without it still type-check. */
  probationStatus?: ProbationStatus | null

  // Contract
  contractType: ContractType
  contractStartDate?: string | null
  /** Required for fixed-term contracts — drives the expiring-soon flag (M01-F10). */
  contractEndDate?: string | null

  // Disciplinary & Recognition — §12.1. recognitionType has no specced enum, so it stays free text.
  disciplinaryType?: DisciplinaryType | null
  disciplinaryStartPeriod?: string | null
  disciplinaryEndPeriod?: string | null
  recognitionType?: string | null
  recognitionPeriod?: string | null

  // Separation — set by archiveEmployee only (E01-US03)
  resignationDate?: string | null
  resignationReason?: string | null
  /** Actual final working day — distinct from resignationDate (when the resignation was recorded). employee-onboarding-exit-checklist.md §3. */
  lastWorkingDate?: string | null

  /** Overrides BaseDocument's generic status: 'active' | 'inactive'. */
  status: 'active' | 'inactive'
}

/**
 * Sub-collection at employees/{employeeId}/compensation/current — split out
 * from Employee per the field-level-security decision (NFR-SE04): salary is
 * hrManager/superAdmin only, but the employee doc itself is readable by
 * GM/Director/department leaders and firestore.rules can't hide individual
 * fields. Only one live document ("current") per employee; history is
 * covered by auditLogs, not a version array here. Written by
 * updateEmployeeCompensation only.
 */
export interface EmployeeCompensation {
  basicSalary: number
  positionAllowance?: number | null
  phoneAllowance?: number | null
  transportationAllowance?: number | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  updatedAt: string
  updatedBy: string
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
// Master Database). Nothing below is written to Firestore yet. Do NOT use
// these in shipped code paths yet.
// ---------------------------------------------------------------------------

// ProbationStatus and TaxStatus were promoted out of this PLANNED section
// (2026-08-17) into src/constants/hr.ts, and EmployeeCompensation (2026-08-17)
// up next to Employee above — all three now ship. MaritalStatus stays here:
// §12.1 never asked for it, it was drafted speculatively for tax-status
// computation UI that doesn't exist yet.
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
