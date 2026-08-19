import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, requirePermission, AppError, handleError, successResponse, PERMISSIONS } from '../../lib'

const MAX_ENTRIES = 50

/**
 * auditLogs is `allow read, write: if false` in firestore.rules (AUDIT_LOG.md
 * §8: business modules should not write directly to the audit collection —
 * the rules take that further and block client reads entirely), so an
 * employee's change history (9.1-F07/F15) can't be a direct Firestore read
 * like every other "viewer" in the app. This is the narrow, read-only
 * exception: it returns entries, never mutates, so there is no audit event
 * about the read itself.
 */
export const getEmployeeAuditLog = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { employeeId } = (request.data ?? {}) as { employeeId?: string }
    if (!employeeId) {
      throw new AppError('invalid-argument', 'employeeId is required.')
    }

    const snap = await db
      .collection(COLLECTIONS.AUDIT_LOGS)
      .where('resourceType', '==', 'employee')
      .where('resourceId', '==', employeeId)
      .orderBy('timestamp', 'desc')
      .limit(MAX_ENTRIES)
      .get()

    const entries = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        timestamp: (data.timestamp?.toDate?.() ?? new Date()).toISOString(),
        eventType: data.eventType as string,
        action: data.action as string,
        userName: data.userName as string,
        previousValues: (data.previousValues as Record<string, unknown> | null) ?? null,
        newValues: (data.newValues as Record<string, unknown> | null) ?? null,
      }
    })

    return successResponse({ entries }, 'Audit log loaded.')
  } catch (error) {
    handleError(error)
  }
})
