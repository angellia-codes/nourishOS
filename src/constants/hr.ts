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
 * employee_communication.md §13 — "Verbal Notification: valid for 3 months.
 * Written Warning: valid for 6 months," counted from the acknowledgement date
 * (§35 Rule 5). Coaching and termination have no validity window: coaching is
 * not a sanction, and a termination does not expire.
 *
 * Mirrors DISCIPLINARY_VALIDITY_DAYS in functions/src/hr/employees/helpers.ts —
 * used here only to prefill the form's per-record override, since the server
 * recomputes the window at acknowledgement from what is stored.
 */
export const DISCIPLINARY_VALIDITY_DAYS: Record<DisciplinaryType, number | null> = {
  coaching: null,
  verbalWarning: 90,
  SP1: 180,
  SP2: 180,
  SP3: 180,
  termination: null,
}

/**
 * Employee lifecycle events shown on the profile timeline — HR.md §13.
 * Written server-side alongside the mutation that caused them.
 */
export const EMPLOYEE_ACTIVITY_TYPE = {
  HIRED: 'hired',
  UPDATED: 'updated',
  ARCHIVED: 'archived',
  REACTIVATED: 'reactivated',
  PROMOTED: 'promoted',
  DEPARTMENT_TRANSFER: 'departmentTransfer',
  OUTLET_TRANSFER: 'outletTransfer',
  DISCIPLINARY_WARNING: 'disciplinaryWarning',
  APPRAISAL_COMPLETED: 'appraisalCompleted',
  CONTRACT_RENEWED: 'contractRenewed',
  CONTRACT_TERMINATED: 'contractTerminated',
  TRAINING_COMPLETED: 'trainingCompleted',
} as const

export type EmployeeActivityType = (typeof EMPLOYEE_ACTIVITY_TYPE)[keyof typeof EMPLOYEE_ACTIVITY_TYPE]

/** Source: HR_OPERATIONS.md §12.1 probationStatus. Promoted out of employee.types.ts's PLANNED section — the shape was already correct, just unused. */
export const PROBATION_STATUS = {
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
  EXTENDED: 'extended',
} as const

export type ProbationStatus = (typeof PROBATION_STATUS)[keyof typeof PROBATION_STATUS]

export const PROBATION_STATUS_LABELS: Record<ProbationStatus, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
  extended: 'Extended',
}

/** Indonesian PPh21 personal income tax status — HR_OPERATIONS.md §12.1 personalTaxStatus. Promoted out of employee.types.ts's PLANNED section, same as ProbationStatus above. */
export const TAX_STATUS = {
  TK0: 'TK0',
  TK1: 'TK1',
  TK2: 'TK2',
  TK3: 'TK3',
  K0: 'K0',
  K1: 'K1',
  K2: 'K2',
  K3: 'K3',
} as const

export type TaxStatus = (typeof TAX_STATUS)[keyof typeof TAX_STATUS]

export const BLOOD_TYPE = {
  A: 'A',
  B: 'B',
  AB: 'AB',
  O: 'O',
} as const

export type BloodType = (typeof BLOOD_TYPE)[keyof typeof BLOOD_TYPE]

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A: 'A',
  B: 'B',
  AB: 'AB',
  O: 'O',
}

/** Deliberately 3 values, not employee.types.ts's old speculative 4-value draft — no "divorced" option was asked for. Matches the candidate portal's own MARITAL_STATUSES (functions/src/recruitment/portal/applicationForm.ts). */
export const MARITAL_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  WIDOWED: 'widowed',
} as const

export type MaritalStatus = (typeof MARITAL_STATUS)[keyof typeof MARITAL_STATUS]

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
}

export const TSHIRT_SIZE = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
} as const

export type TshirtSize = (typeof TSHIRT_SIZE)[keyof typeof TSHIRT_SIZE]

export const TSHIRT_SIZE_LABELS: Record<TshirtSize, string> = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
}

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  TK0: 'TK0 — Single, 0 dependents',
  TK1: 'TK1 — Single, 1 dependent',
  TK2: 'TK2 — Single, 2 dependents',
  TK3: 'TK3 — Single, 3 dependents',
  K0: 'K0 — Married, 0 dependents',
  K1: 'K1 — Married, 1 dependent',
  K2: 'K2 — Married, 2 dependents',
  K3: 'K3 — Married, 3 dependents',
}

/** Source: HR_OPERATIONS.md §11 Training Types. */
export const TRAINING_TYPE = {
  SOP: 'sop',
  SAFETY: 'safety',
  FOOD_SAFETY: 'foodSafety',
  CUSTOMER_SERVICE: 'customerService',
  LEADERSHIP: 'leadership',
  TECHNICAL: 'technical',
} as const

export type TrainingType = (typeof TRAINING_TYPE)[keyof typeof TRAINING_TYPE]

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  sop: 'SOP',
  safety: 'Safety',
  foodSafety: 'Food Safety',
  customerService: 'Customer Service',
  leadership: 'Leadership',
  technical: 'Technical Skills',
}
