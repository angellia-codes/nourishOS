import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

/** Soft delete. Blocked while any active employee still holds this position — §12 acceptance criteria. */
export const archivePosition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_ARCHIVE)

    const { positionId } = (request.data ?? {}) as { positionId?: string }
    if (!positionId) {
      throw new AppError('invalid-argument', 'positionId is required.')
    }

    const ref = db.collection(COLLECTIONS.POSITIONS).doc(positionId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Position not found.')
    }

    // Checks both `position` (the pre-existing PositionId enum field every
    // employee has always carried) and `positionId` (migrateEmployeePositions'
    // denormalized copy) — they share the same slug space, but not every
    // employee doc is guaranteed to have the newer field populated yet.
    const [byLegacyField, byMigratedField] = await Promise.all([
      db.collection(COLLECTIONS.EMPLOYEES).where('position', '==', positionId).where('status', '==', 'active').limit(1).get(),
      db.collection(COLLECTIONS.EMPLOYEES).where('positionId', '==', positionId).where('status', '==', 'active').limit(1).get(),
    ])
    if (!byLegacyField.empty || !byMigratedField.empty) {
      throw new AppError('failed-precondition', 'This position still has an active employee assigned to it.')
    }

    await ref.update({ isActive: false, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'PositionArchived',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      action: 'archive',
      user,
    })

    return successResponse(undefined, 'Position archived.')
  } catch (error) {
    handleError(error)
  }
})
