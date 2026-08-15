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
 * Revised per hand-off (2026-08-15) to the 5 values actually used: Hindu,
 * Christian, Catholic, Islam, Other. Was a free `<Input>` before this
 * revision — the stricter `Religion` union in employee.types.ts's PLANNED
 * section was a different, incomplete list, so this is a new enum rather
 * than promoting that one.
 */
export const RELIGION = {
  HINDU: 'hindu',
  CHRISTIAN: 'christian',
  CATHOLIC: 'catholic',
  ISLAM: 'islam',
  OTHER: 'other',
} as const

export type Religion = (typeof RELIGION)[keyof typeof RELIGION]

export const RELIGION_LABELS: Record<Religion, string> = {
  hindu: 'Hindu',
  christian: 'Christian',
  catholic: 'Catholic',
  islam: 'Islam',
  other: 'Other',
}

/** Source: HR_OPERATIONS.md §12.1 disciplinaryType — escalation ladder. */
export const DISCIPLINARY_TYPE = {
  COACHING: 'coaching',
  VERBAL_WARNING: 'verbalWarning',
  SP1: 'SP1',
  SP2: 'SP2',
  SP3: 'SP3',
  TERMINATION: 'termination',
} as const

export type DisciplinaryType = (typeof DISCIPLINARY_TYPE)[keyof typeof DISCIPLINARY_TYPE]

export const DISCIPLINARY_TYPE_LABELS: Record<DisciplinaryType, string> = {
  coaching: 'Coaching',
  verbalWarning: 'Verbal Warning',
  SP1: 'SP1 (First Warning Letter)',
  SP2: 'SP2 (Second Warning Letter)',
  SP3: 'SP3 (Final Warning Letter)',
  termination: 'Termination',
}

/** Severity rank for sorting by disciplinary action (9.1-F06) — lower is less severe. */
export const DISCIPLINARY_TYPE_RANK: Record<DisciplinaryType, number> = {
  coaching: 1,
  verbalWarning: 2,
  SP1: 3,
  SP2: 4,
  SP3: 5,
  termination: 6,
}

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
