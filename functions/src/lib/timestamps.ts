import { FieldValue } from 'firebase-admin/firestore'

/**
 * Nourish Group operates on WITA (UTC+8). Cloud Functions run with TZ unset,
 * so the runtime clock is UTC and every "what is today" derivation has to name
 * the zone explicitly. Note that toISOString() is always UTC no matter what TZ
 * is set to, so it can never produce a correct date key on its own: between
 * 00:00 and 08:00 WITA it still reports the previous day.
 *
 * Scheduled functions pass this as onSchedule's `timeZone` for the same reason
 * — Cloud Scheduler also defaults to UTC.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Makassar'

/**
 * Today's date key ('YYYY-MM-DD') in WITA. 'en-CA' is used because its short
 * date format is already ISO order — no manual part assembly needed.
 */
export function todayIso(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIME_ZONE })
}

/** Date key N days from today, in WITA. Calendar-safe — no time-of-day drift. */
export function addDaysIso(days: number, from = todayIso()): string {
  const date = new Date(`${from}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Current year in WITA — used by the per-year document number sequences. */
export function currentBusinessYear(): number {
  return Number(todayIso().slice(0, 4))
}

/**
 * The BaseDocument fields every new operational document carries
 * (DATABASE.md §5, mirrored client-side in src/types/firestore.types.ts).
 * Spread LAST in the .set() payload is fine — callers pass domain fields
 * first and these stamps close the object.
 */
export function newDocumentBaseFields(uid: string, status = 'active') {
  return {
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    status,
    isArchived: false,
  }
}

/** Spread into every .update() so updatedAt/updatedBy can never be forgotten. */
export function updatedFields(uid: string) {
  return {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }
}
