/**
 * HR: Employee Database enums.
 * Source: HR.md §5 (Employee Information) + HR_OPERATIONS.md §9.1 / §12.1.
 *
 * Naming note: HR_OPERATIONS.md's employment_status enum (FT/FL/BOD/DW/OJT/
 * RESIGN) mixes employment *type* with lifecycle state. Here employment type
 * and active/resigned state are kept separate — `employmentStatus` below is
 * the type, and the document's BaseDocument.status carries active/inactive.
 */
export const EMPLOYMENT_STATUS = {
  /** PKWT/PKWTT full-time staff. */
  FIXED_TERM: 'PKWT',
  PERMANENT: 'PKWTT',
  FREELANCE: 'freelance',
  /** Board of Directors. */
  BOARD: 'bod',
  DAILY_WORKER: 'dailyWorker',
  /** On-the-Job Training (intern/trainee). */
  OJT: 'ojt',
} as const

export type EmploymentStatus = (typeof EMPLOYMENT_STATUS)[keyof typeof EMPLOYMENT_STATUS]

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  PKWT: 'Fixed-Term',
  PKWTT: 'Permanent',
  freelance: 'Freelance',
  bod: 'Board of Directors',
  dailyWorker: 'Daily Worker',
  ojt: 'On-the-Job Training',
}

/**
 * Employee number prefix per employment status — HR_OPERATIONS.md 9.1-F02:
 * N-NNNN (PKWT/PKWTT/BOD/Freelance), DW-NNNN (Daily Worker), OJT-NNNN (OJT).
 * Mirrored in functions/src/hr/employees/helpers.ts, where numbers are
 * actually generated — keep both in sync.
 */
export const EMPLOYEE_NUMBER_PREFIX: Record<EmploymentStatus, string> = {
  PKWT: 'N',
  PKWTT: 'N',
  freelance: 'N',
  bod: 'N',
  dailyWorker: 'DW',
  ojt: 'OJT',
}

/** Source: HR_OPERATIONS.md §12.1 contractType. */
export const CONTRACT_TYPE = {
  PERMANENT: 'permanent',
  FIXED_TERM: 'fixedTerm',
  DAILY: 'daily',
} as const

export type ContractType = (typeof CONTRACT_TYPE)[keyof typeof CONTRACT_TYPE]

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: 'Permanent',
  fixedTerm: 'Fixed Term',
  daily: 'Daily',
}

export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
} as const

export type Gender = (typeof GENDERS)[keyof typeof GENDERS]

/**
 * Employee lifecycle events shown on the profile timeline — HR.md §13.
 * Written server-side alongside the mutation that caused them; more values
 * (promoted, transferred, trainingCompleted, …) arrive with their modules.
 */
export const EMPLOYEE_ACTIVITY_TYPE = {
  HIRED: 'hired',
  UPDATED: 'updated',
  ARCHIVED: 'archived',
} as const

export type EmployeeActivityType = (typeof EMPLOYEE_ACTIVITY_TYPE)[keyof typeof EMPLOYEE_ACTIVITY_TYPE]
