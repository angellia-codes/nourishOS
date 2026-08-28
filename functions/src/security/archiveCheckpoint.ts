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
import { auditSnapshot } from './helpers'

/**
 * security-control-point.md §7 — decommission a checkpoint.
 *
 * Soft only, like everything else in this repo: `isArchived` was already queried
 * by checkOverdueCheckpoints and getActiveCheckpoints but set by nothing, so a
 * checkpoint could be created and never retired. Flipping the flag drops it out
 * of the guard's list and the overdue sweep while patrolLogs keep resolving its
 * name — the history of who walked where stays intact, and the flag can be
 * reverted.
 *
 * No isArchived guard on the way in: re-archiving an archived checkpoint is a
 * no-op that succeeds, matching deleteSop.
 */
export const archiveCheckpoint = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHECKPOINTS_MANAGE)

    const { checkpointId } = (request.data ?? {}) as { checkpointId?: string }
    const id = typeof checkpointId === 'string' ? checkpointId.trim() : ''
    if (!id) {
      throw new AppError('invalid-argument', 'checkpointId is required.')
    }

    const ref = db.collection(COLLECTIONS.CHECKPOINTS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That checkpoint no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ status: 'archived', isArchived: true, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'CheckpointArchived',
      category: 'Security',
      module: 'security',
      resourceType: 'checkpoint',
      resourceId: id,
      action: 'delete',
      user,
      previousValues: auditSnapshot(previous),
    })

    return successResponse({ checkpointId: id }, 'Checkpoint archived.')
  } catch (error) {
    return handleError(error)
  }
})
