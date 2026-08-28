import { db, COLLECTIONS, AppError } from '../../lib'
import { OUTLET_NAMES } from '../../lib/organization'
import type { AttendanceAggregateTotals, ResolvedAttendanceEmployee } from './validate'

/**
 * Everything `previewAttendanceImport` and `importAttendancePeriod` both need
 * to load before they can validate — attendance.md §5. Split out so the
 * preview and the gate resolve identically, mirroring
 * functions/src/hr/payroll/context.ts.
 */

const PERIOD_RE = /^\d{4}-\d{2}$/

export function requirePeriod(raw: unknown): string {
  if (typeof raw !== 'string' || !PERIOD_RE.test(raw)) {
    throw new AppError('invalid-argument', 'period must be in YYYY-MM format.')
  }
  return raw
}

/** Calendar days in a 'YYYY-MM' period — the V5 reconciliation target. */
export function daysInMonth(period: string): number {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Reverse of OUTLET_NAMES, lower-cased for a case-insensitive CSV match. */
export function outletIdByDisplayName(): Record<string, string> {
  const reversed: Record<string, string> = {}
  for (const [outletId, name] of Object.entries(OUTLET_NAMES)) {
    reversed[name.toLowerCase()] = outletId
  }
  return reversed
}

/** §4.2 — resolves every wanted employee_number against the roster, one read (161 employees). */
export async function loadEmployeesByNumber(
  employeeNumbers: string[],
): Promise<Map<string, ResolvedAttendanceEmployee>> {
  const wanted = new Set(employeeNumbers.filter(Boolean))
  const snap = await db.collection(COLLECTIONS.EMPLOYEES).get()

  const resolved = new Map<string, ResolvedAttendanceEmployee>()
  for (const doc of snap.docs) {
    const data = doc.data()
    const employeeNumber = (data.employeeNumber as string | undefined) ?? ''
    if (!wanted.has(employeeNumber)) continue

    resolved.set(employeeNumber, {
      employeeId: doc.id,
      employeeNumber,
      fullName: (data.fullName as string | undefined) ?? '',
      outletId: (data.outletId as string | undefined) ?? '',
      employmentStatus: (data.employmentStatus as string | undefined) ?? '',
      status: (data.status as string | undefined) ?? 'active',
    })
  }
  return resolved
}

/** W3 — every currently-active employee's number, to catch a scheduled-but-absent row. */
export async function loadActiveEmployeeNumbers(): Promise<Set<string>> {
  const snap = await db.collection(COLLECTIONS.EMPLOYEES).where('status', '==', 'active').get()
  const numbers = new Set<string>()
  for (const doc of snap.docs) {
    const employeeNumber = doc.data().employeeNumber as string | undefined
    if (employeeNumber) numbers.add(employeeNumber)
  }
  return numbers
}

/**
 * §5.3 — the previous approved period's totals, for the preview's
 * order-of-magnitude diff. Null if none exists yet.
 *
 * A single equality filter (`status == 'approved'`) plus an in-memory sort on
 * the `period` field — deliberately not a range/orderBy, which would need its
 * own composite index alongside the equality filter. D5's "compute on read"
 * reasoning applies at this scale (~24 periods/2yr).
 */
export async function loadPreviousPeriodTotals(period: string): Promise<AttendanceAggregateTotals | null> {
  const snap = await db.collection(COLLECTIONS.ATTENDANCE_PERIODS).where('status', '==', 'approved').get()
  const priorPeriodIds = snap.docs
    .filter((doc) => (doc.data().period as string) < period)
    .sort((a, b) => (a.data().period as string).localeCompare(b.data().period as string))
  if (priorPeriodIds.length === 0) return null

  return computePeriodTotals(priorPeriodIds.at(-1)!.id)
}

async function computePeriodTotals(periodDocId: string): Promise<AttendanceAggregateTotals> {
  const recordsSnap = await db.collection(COLLECTIONS.ATTENDANCE_RECORDS).where('periodId', '==', periodDocId).get()
  const totals: AttendanceAggregateTotals = {
    headcount: 0,
    totalWD: 0,
    totalEntitledLeave: 0,
    totalUL: 0,
    totalLateIncidents: 0,
  }
  for (const doc of recordsSnap.docs) {
    const data = doc.data()
    const days = (data.days ?? {}) as Record<string, number>
    totals.headcount += 1
    totals.totalWD += days.WD ?? 0
    totals.totalEntitledLeave += (days.PH ?? 0) + (days.DP ?? 0) + (days.AL ?? 0) + (days.MC ?? 0) + (days.EO ?? 0) + (days.SL ?? 0)
    totals.totalUL += days.UL ?? 0
    totals.totalLateIncidents += (data.lateCount as number) ?? 0
  }
  return totals
}

/**
 * §6.2 — the current head of a month's lineage: the one document for this
 * `period` string that hasn't itself been superseded yet. A month's first
 * import gets doc id === period; a correction gets an auto-generated id, so
 * this is a field query, never a `.doc(period)` lookup. Two equality
 * filters — auto-indexed, no composite index needed.
 */
export async function findHeadPeriod(period: string): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
  const snap = await db
    .collection(COLLECTIONS.ATTENDANCE_PERIODS)
    .where('period', '==', period)
    .where('supersededByPeriodId', '==', null)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0]
}
