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
} from '../lib'
import { auditSnapshot, validateCheckpointFields } from './helpers'

/**
 * security-control-point.md §7 — edit an existing checkpoint.
 *
 * Named gap in that doc's §2 until now: a mis-typed radius or a moved post could
 * never be corrected. Same shape as updateSop.
 *
 * The update writes only the validated fields, so lastVisitedAt / lastVisitedBy /
 * lastAlertedAt survive untouched — patrol history is not an admin's to rewrite.
 */
export const updateCheckpoint = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHECKPOINTS_MANAGE)

    const data = (request.data ?? {}) as Record<string, unknown> & { checkpointId?: string }
    const checkpointId = typeof data.checkpointId === 'string' ? data.checkpointId.trim() : ''
    if (!checkpointId) {
      throw new AppError('invalid-argument', 'checkpointId is required.')
    }

    const fields = validateCheckpointFields(data)

    const ref = db.collection(COLLECTIONS.CHECKPOINTS).doc(checkpointId)
    const snap = await ref.get()
    // An archived checkpoint is gone as far as editing is concerned — same guard
    // updateSop uses, so a decommissioned post cannot be quietly brought back by
    // editing it.
    if (!snap.exists || snap.data()?.isArchived === true) {
      throw new AppError('not-found', 'That checkpoint no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'CheckpointUpdated',
      category: 'Security',
      module: 'security',
      resourceType: 'checkpoint',
      resourceId: checkpointId,
      action: 'update',
      user,
      previousValues: auditSnapshot(previous),
      newValues: fields,
    })

    return successResponse({ checkpointId }, 'Checkpoint updated.')
  } catch (error) {
    return handleError(error)
  }
})
