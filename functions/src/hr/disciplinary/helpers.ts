import { db, COLLECTIONS, AppError } from '../../lib'

// employee-disciplinary-action.md §3 — the six-level escalation ladder
// (Coaching → Verbal Warning → SP1 → SP2 → SP3 → Suspension/Termination).
export const DISCIPLINARY_TYPES = ['coaching', 'verbalWarning', 'sp1', 'sp2', 'sp3', 'suspensionTermination'] as const
export type DisciplinaryType = (typeof DISCIPLINARY_TYPES)[number]

// §3/§7 — the four acknowledgment parties (digitized as written: all four,
// every level — the §4 flag about conditional signatures is left as-is).
export const ACK_PARTIES = ['employee', 'departmentHead', 'generalManager', 'hrManager'] as const
export type AckParty = (typeof ACK_PARTIES)[number]

/** Next rung up the ladder (§3 nextEscalationLevel auto-suggestion), or undefined at the top. */
export function nextEscalationLevel(type: DisciplinaryType): DisciplinaryType | undefined {
  const i = DISCIPLINARY_TYPES.indexOf(type)
  return DISCIPLINARY_TYPES[i + 1]
}

/**
 * Validity months by type (§1/AC-2): +3 for coaching/verbalWarning, +6 for
 * SP1/SP2/SP3/suspensionTermination. Same source rule as the employee sheet's
 * disciplinary_end_period.
 */
export function validityMonths(type: DisciplinaryType): number {
  return type === 'coaching' || type === 'verbalWarning' ? 3 : 6
}

/** Adds `months` to a 'YYYY-MM-DD' civil date, calendar-safe (UTC, no tz drift). */
export function addMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

/**
 * Next disciplinary-action number, e.g. DA-2026-0001. Resets per year — same
 * transaction-counter shape as allocateEmployeeNumber / allocateRequisitionNumber.
 */
export async function allocateActionNumber(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const key = `DA-${year}`
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('disciplinaryActionNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return `${key}-${String(next).padStart(4, '0')}`
}

/**
 * Which acknowledgment party the caller is entitled to sign, or null if none
 * (§6 RBAC). Role maps directly for HR/GM/Department Head; the employee party
 * matches on email since the shipped Employee record carries no uid link.
 * Super Admin may sign any party (in-person / escape-hatch).
 */
export function entitledParty(
  party: AckParty,
  user: { roleId: string; email: string | null; departmentId: string | null },
  action: { departmentId: string },
  employee: { email: string },
): boolean {
  if (user.roleId === 'superAdmin') return true
  switch (party) {
    case 'hrManager':
      return user.roleId === 'hrManager'
    case 'generalManager':
      return user.roleId === 'generalManager'
    case 'departmentHead':
      return user.roleId === 'outletManager' && user.departmentId === action.departmentId
    case 'employee':
      return !!user.email && user.email === employee.email
    default:
      return false
  }
}

export function requireDisciplinaryType(value: unknown): DisciplinaryType {
  if (typeof value !== 'string' || !DISCIPLINARY_TYPES.includes(value as DisciplinaryType)) {
    throw new AppError('invalid-argument', 'A valid disciplinaryType is required.')
  }
  return value as DisciplinaryType
}
