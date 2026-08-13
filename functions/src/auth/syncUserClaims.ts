import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { authAdmin, REGION } from '../lib'

/**
 * Keeps Firebase Auth custom claims {role, departmentId, outletId} in sync
 * with the users/{uid} profile doc. firestore.rules reads these off the
 * token (request.auth.token.role) instead of get()-ing the user doc on
 * every read — that speed is why the claims exist (see src/firestore.rules
 * header comment).
 *
 * Claim propagation caveat: an already-signed-in user keeps their old
 * claims until their ID token refreshes (up to ~1 hour). Cloud Functions
 * are unaffected — requireActiveUser reads the live profile doc — so a
 * role change is enforced immediately on writes, eventually on rule-gated
 * reads.
 */
export const syncUserClaims = onDocumentWritten(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const uid = event.params.uid
    const after = event.data?.after?.data()

    try {
      if (!after) {
        // Profile deleted — strip claims so rules stop granting role-based reads.
        await authAdmin.setCustomUserClaims(uid, null)
        return
      }

      const before = event.data?.before?.data()
      if (
        before &&
        before.roleId === after.roleId &&
        before.departmentId === after.departmentId &&
        before.outletId === after.outletId
      ) {
        return // Nothing claim-relevant changed (e.g. lastLogin/theme update) — skip the Auth write.
      }

      await authAdmin.setCustomUserClaims(uid, {
        role: after.roleId ?? null,
        departmentId: after.departmentId ?? null,
        outletId: after.outletId ?? null,
      })
    } catch (error) {
      // Rethrown so the event retries — stale claims are a security-relevant failure.
      logger.error(`Failed to sync custom claims for user ${uid}`, error)
      throw error
    }
  },
)
