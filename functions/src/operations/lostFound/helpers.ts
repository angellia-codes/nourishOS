import { db, COLLECTIONS } from '../../lib'

export type LostFoundCategory =
  | 'electronics'
  | 'wallet'
  | 'bag'
  | 'clothing'
  | 'jewelry'
  | 'documents'
  | 'keys'
  | 'eyewear'
  | 'other'

export type LostFoundValueTier = 'low' | 'medium' | 'high'

/** lost-and-found-report.md §5 — suggested category hold periods (days), pending policy sign-off. */
export const RETENTION_DAYS: Record<LostFoundCategory, number> = {
  documents: 90,
  electronics: 60,
  jewelry: 60,
  wallet: 60,
  bag: 30,
  clothing: 30,
  eyewear: 30,
  keys: 30,
  other: 14,
}

/** foundAt ('YYYY-MM-DD') + RETENTION_DAYS[category], calendar-safe (UTC, no time-of-day drift). */
export function calculateRetentionExpiresAt(foundAt: string, category: LostFoundCategory): string {
  const date = new Date(`${foundAt}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + RETENTION_DAYS[category])
  return date.toISOString().slice(0, 10)
}

/**
 * Next Lost & Found item number, e.g. LF-2026-0001. Resets per year — the
 * counter is keyed by "LF-<year>" in the same systemSettings doc pattern as
 * allocateEmployeeNumber (functions/src/hr/employees/helpers.ts).
 */
export async function allocateLostFoundItemNumber(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const key = `LF-${year}`
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('lostFoundItemNumberSequences')

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[key] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [key]: value }, { merge: true })
    return value
  })

  return `${key}-${String(next).padStart(4, '0')}`
}
