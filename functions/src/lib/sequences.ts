import { db } from './admin'
import { COLLECTIONS } from './collections'
import { currentBusinessYear } from './timestamps'

/**
 * Per-year sequential document number — REQ-2026-0042, EXP-2026-0001 — claimed
 * inside a transaction so two concurrent submissions can't collide. The year
 * comes from currentBusinessYear() (WITA), never toISOString().
 *
 * The counter doc lives in systemSettings under `counterDocId`, one field per
 * year. firestore.rules matches systemSettings by literal doc id only, so these
 * counters stay in the deny-all and are Admin-SDK-only by construction.
 *
 * ponytail: the incident and lost & found allocators still carry their own copy.
 * They store the counter under a `INC-2026`-style field key rather than `2026`,
 * so folding them in here is a data migration, not a refactor.
 */
export async function allocateYearlyNumber(counterDocId: string, prefix: string): Promise<string> {
  const year = currentBusinessYear()
  const counterRef = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(counterDocId)

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.[String(year)] as number | undefined) ?? 0
    const value = current + 1
    tx.set(counterRef, { [String(year)]: value }, { merge: true })
    return value
  })

  return `${prefix}-${year}-${String(next).padStart(4, '0')}`
}
