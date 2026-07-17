import { db, COLLECTIONS, AppError, newDocumentBaseFields, type AuthedUser } from '../../lib'

/** Mirrors src/constants/hr.ts (known frontend/functions duplication — keep in sync). */
export const EMPLOYMENT_STATUSES = ['PKWT', 'PKWTT', 'freelance', 'bod', 'dailyWorker', 'ojt'] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const CONTRACT_TYPES = ['permanent', 'fixedTerm', 'daily'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const GENDERS = ['male', 'female'] as const

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

/** Appends one entry to the employee's profile timeline (HR.md §13). */
export async function recordEmployeeActivity(
  employee: { id: string; departmentId?: string; outletId?: string },
  activityType: 'hired' | 'updated' | 'archived',
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
