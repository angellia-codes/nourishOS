import { db, COLLECTIONS, AppError, newDocumentBaseFields, type AuthedUser } from '../../lib'

/** Mirrors src/constants/hr.ts (known frontend/functions duplication — keep in sync). */
export const EMPLOYMENT_STATUSES = ['PKWT', 'PKWTT', 'freelance', 'bod', 'dailyWorker', 'ojt'] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const CONTRACT_TYPES = ['permanent', 'fixedTerm', 'daily'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const GENDERS = ['male', 'female'] as const

/** Mirrors src/constants/hr.ts DISCIPLINARY_TYPE (known frontend/functions duplication — keep in sync). */
export const DISCIPLINARY_TYPES = ['coaching', 'verbalWarning', 'SP1', 'SP2', 'SP3', 'termination'] as const
export type DisciplinaryType = (typeof DISCIPLINARY_TYPES)[number]

/**
 * employee_communication.md §7 — the Employee Communication record lifecycle.
 * `open` is retained only for records written before the workflow existed; it
 * behaves like `active` with no validity window (see communicationExpiry.ts).
 */
export const COMMUNICATION_STATUSES = [
  'draft',
  'pendingApproval',
  'pendingEmployee',
  'active',
  'expired',
  'closed',
  'open',
] as const
export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number]

/** §16 — receipt is not agreement, so `refused` still starts the validity clock. */
export const ACKNOWLEDGEMENT_STATUSES = ['pending', 'acknowledged', 'refused', 'unableToSign'] as const
export type AcknowledgementStatus = (typeof ACKNOWLEDGEMENT_STATUSES)[number]

/** §18 — no signature canvas exists in this app, so a drawn signature is not offered. */
export const SIGNATURE_METHODS = ['typedSignature', 'acknowledgement'] as const
export type SignatureMethod = (typeof SIGNATURE_METHODS)[number]

/** §11 — the Proposed Solution / Action categories. */
export const PROPOSED_ACTION_CATEGORIES = [
  'coaching',
  'retraining',
  'counseling',
  'followUpMeeting',
  'performanceImprovement',
  'scheduleAdjustment',
  'writtenWarning',
  'other',
] as const
export type ProposedActionCategory = (typeof PROPOSED_ACTION_CATEGORIES)[number]

/**
 * §13 — "Verbal Notification: valid for 3 months. Written Warning: valid for 6
 * months," counted from the acknowledgement date (§35 Rule 5). Coaching and
 * termination have no validity window: coaching is not a sanction and a
 * termination does not expire.
 *
 * Mirrors DISCIPLINARY_VALIDITY_DAYS in src/constants/hr.ts.
 *
 * ponytail: §13 wants these HR-configurable, and the per-record `validityDays`
 * override on the form is what delivers that. If the defaults themselves ever
 * need editing without a deploy, move this map into a
 * `systemSettings/communicationValidity` doc and read it here.
 */
export const DISCIPLINARY_VALIDITY_DAYS: Record<DisciplinaryType, number | null> = {
  coaching: null,
  verbalWarning: 90,
  SP1: 180,
  SP2: 180,
  SP3: 180,
  termination: null,
}

/** Mirrors src/constants/hr.ts RELIGION (known frontend/functions duplication — keep in sync). */
export const RELIGIONS = ['hindu', 'christian', 'catholic', 'islam', 'other'] as const
export type Religion = (typeof RELIGIONS)[number]

/** Mirrors src/constants/hr.ts PROBATION_STATUS (known frontend/functions duplication — keep in sync). */
export const PROBATION_STATUSES = ['pending', 'passed', 'failed', 'extended'] as const
export type ProbationStatus = (typeof PROBATION_STATUSES)[number]

/** Mirrors src/constants/hr.ts TAX_STATUS (known frontend/functions duplication — keep in sync). */
export const TAX_STATUSES = ['TK0', 'TK1', 'TK2', 'TK3', 'K0', 'K1', 'K2', 'K3'] as const
export type TaxStatus = (typeof TAX_STATUSES)[number]

/** HR_OPERATIONS.md 9.1-F02: N- (PKWT/PKWTT/BOD/Freelance), DW- (Daily Worker), OJT-. */
const EMPLOYEE_NUMBER_PREFIX: Record<EmploymentStatus, string> = {
  PKWT: 'N',
  PKWTT: 'N',
  freelance: 'N',
  bod: 'N',
  dailyWorker: 'DW',
  ojt: 'OJT',
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Validates a 'YYYY-MM-DD' civil-date string; throws invalid-argument otherwise. */
export function requireIsoDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AppError('invalid-argument', `${fieldName} must be a valid YYYY-MM-DD date.`)
  }
  return value
}

/** joinDate + probationMonths, calendar-safe (UTC, no time-of-day drift). */
export function calculateProbationEndDate(joinDate: string, probationMonths: number): string | null {
  if (probationMonths <= 0) return null
  const date = new Date(`${joinDate}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + probationMonths)
  return date.toISOString().slice(0, 10)
}

/**
 * Next employee number for the status's prefix, e.g. N-0042 (M01-F02).
 * Sequences live in one systemSettings doc and are claimed inside a
 * transaction so concurrent hires can't collide.
 */
export async function allocateEmployeeNumber(employmentStatus: EmploymentStatus): Promise<string> {
  const prefix = EMPLOYEE_NUMBER_PREFIX[employmentStatus]
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('employeeNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[prefix] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [prefix]: value }, { merge: true })
    return value
  })

  return `${prefix}-${String(next).padStart(4, '0')}`
}

/**
 * Enforces the HR.md §21 uniqueness rules (email, phone) against active and
 * archived employees alike — a rehire gets a fresh record, but two live
 * records must never share contact identity. `excludeId` skips the record
 * being updated.
 */
export async function assertContactFieldsUnique(
  fields: { email?: string; phone?: string },
  excludeId?: string,
): Promise<void> {
  const checks: Array<{ field: 'email' | 'phone'; value: string }> = []
  if (fields.email) checks.push({ field: 'email', value: fields.email })
  if (fields.phone) checks.push({ field: 'phone', value: fields.phone })

  for (const { field, value } of checks) {
    const snap = await db.collection(COLLECTIONS.EMPLOYEES).where(field, '==', value).limit(2).get()
    const conflict = snap.docs.find((doc) => doc.id !== excludeId)
    if (conflict) {
      throw new AppError('already-exists', `An employee with this ${field} already exists (${conflict.id}).`)
    }
  }
}

/** Mirrors src/constants/hr.ts EMPLOYEE_ACTIVITY_TYPE (known frontend/functions duplication — keep in sync). */
export type EmployeeActivityType =
  | 'hired'
  | 'updated'
  | 'archived'
  | 'promoted'
  | 'departmentTransfer'
  | 'outletTransfer'
  | 'disciplinaryWarning'
  | 'appraisalCompleted'
  | 'contractRenewed'
  | 'contractTerminated'
  | 'trainingCompleted'

/** Appends one entry to the employee's profile timeline (HR.md §13). */
export async function recordEmployeeActivity(
  employee: { id: string; departmentId?: string; outletId?: string },
  activityType: EmployeeActivityType,
  description: string,
  user: AuthedUser,
): Promise<void> {
  await db.collection(COLLECTIONS.EMPLOYEE_ACTIVITIES).add({
    employeeId: employee.id,
    activityType,
    description,
    departmentId: employee.departmentId ?? null,
    outletId: employee.outletId ?? null,
    ...newDocumentBaseFields(user.uid, 'completed'),
  })
}
