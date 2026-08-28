import { db } from './admin'
import { COLLECTIONS } from './collections'

/**
 * The employee's own login, if they have one. Firestore rules can only
 * compare against `request.auth.uid`, so an employee's self-read/self-act
 * access has to be resolved to a concrete uid at write time — the same trick
 * `publishAnnouncement` uses for `audienceUids`. Most floor staff have no
 * `users` doc at all, hence the null; HR acts on their behalf in that case
 * (see `disciplinaryRecords.ts` and `hr/appraisal/acknowledgeAppraisal.ts`,
 * the two callers). Shared here rather than duplicated per module.
 */
export async function resolveEmployeeUid(employeeId: string): Promise<string | null> {
  const snap = await db.collection(COLLECTIONS.USERS).where('employeeId', '==', employeeId).limit(1).get()
  return snap.empty ? null : snap.docs[0].id
}
