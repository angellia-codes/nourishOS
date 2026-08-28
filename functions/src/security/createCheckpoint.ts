import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../lib'
import { validateCheckpointFields } from './helpers'

/**
 * security-control-point.md §2 — registers a patrol control point.
 *
 * Field validation lives in ./helpers so updateCheckpoint enforces exactly the
 * same rules. The three patrol-state fields are initialised null here and are
 * only ever written afterwards by createPatrolLog and checkOverdueCheckpoints.
 */
export const createCheckpoint = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHECKPOINTS_MANAGE)

    const fields = validateCheckpointFields((request.data ?? {}) as Record<string, unknown>)

    const checkpointRef = db.collection(COLLECTIONS.CHECKPOINTS).doc()
    await checkpointRef.set({
      ...fields,
      lastVisitedAt: null,
      lastVisitedBy: null,
      lastAlertedAt: null,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'CheckpointCreated',
      category: 'Security',
      module: 'security',
      resourceType: 'checkpoint',
      resourceId: checkpointRef.id,
      action: 'create',
      user,
      newValues: fields,
    })

    return successResponse({ checkpointId: checkpointRef.id }, 'Checkpoint created.')
  } catch (error) {
    // `return` matters: without it a thrown AppError resolves as an empty
    // success and the client sees no error at all.
    return handleError(error)
  }
})
