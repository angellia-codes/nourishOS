import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
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

/**
 * Soft delete. Blocked while any active employee still holds this position —
 * §12 acceptance criteria. Since 2026-09-24 it also archives every one of the
 * position's appraisal templates in the same batch (same archivedFromStatus
 * fields archiveAppraisalTemplate writes, so each can be restored on its own),
 * and is blocked while one of them is waiting on the GM.
 */
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

    const templatesSnap = await db
      .collection(COLLECTIONS.APPRAISAL_TEMPLATES)
      .where('positionId', '==', positionId)
      .get()
    if (templatesSnap.docs.some((doc) => doc.data().templateStatus === 'pendingGm')) {
      throw new AppError(
        'failed-precondition',
        'An appraisal template for this position is waiting for the GM. Archive it after the GM decides.',
      )
    }

    const batch = db.batch()
    batch.update(ref, {
      isActive: false,
      archivedAt: FieldValue.serverTimestamp(),
      archivedBy: user.uid,
      ...updatedFields(user.uid),
    })
    let templatesArchived = 0
    for (const doc of templatesSnap.docs) {
      const status = doc.data().templateStatus as string
      if (status === 'archived') continue
      batch.update(doc.ref, {
        templateStatus: 'archived',
        archivedFromStatus: status,
        archivedAt: FieldValue.serverTimestamp(),
        archivedBy: user.uid,
        ...updatedFields(user.uid),
      })
      templatesArchived += 1
    }
    await batch.commit()

    await recordAuditEvent({
      eventType: 'PositionArchived',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      action: 'archive',
      user,
      metadata: { templatesArchived },
    })

    return successResponse(
      undefined,
      templatesArchived > 0 ? `Position and ${templatesArchived} appraisal template(s) archived.` : 'Position archived.',
    )
  } catch (error) {
    handleError(error)
  }
})

/** Undo of archivePosition. Templates stay archived — HR restores or regenerates one deliberately. */
export const restorePosition = onCall({ region: REGION }, async (request) => {
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
    if (snap.data()!.isActive !== false) {
      throw new AppError('failed-precondition', 'This position is not archived.')
    }

    await ref.update({
      isActive: true,
      archivedAt: FieldValue.delete(),
      archivedBy: FieldValue.delete(),
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'PositionRestored',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      action: 'restore',
      user,
    })

    return successResponse(undefined, 'Position restored. Its appraisal templates stay archived until you restore one.')
  } catch (error) {
    handleError(error)
  }
})
