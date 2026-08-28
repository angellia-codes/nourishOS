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

/**
 * Assign or clear a position's appraisalScorerPositionId — §2.5, an
 * operational HR assignment, not JD content, so it's a direct write with no
 * approval chain (unlike createPosition/updatePosition).
 */
export const setAppraisalScorer = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_SET_SCORER)

    const { positionId, appraisalScorerPositionId } = (request.data ?? {}) as {
      positionId?: string
      appraisalScorerPositionId?: string | null
    }
    if (!positionId) {
      throw new AppError('invalid-argument', 'positionId is required.')
    }

    const ref = db.collection(COLLECTIONS.POSITIONS).doc(positionId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Position not found.')
    }

    if (appraisalScorerPositionId) {
      const scorerSnap = await db.collection(COLLECTIONS.POSITIONS).doc(appraisalScorerPositionId).get()
      if (!scorerSnap.exists) {
        throw new AppError('invalid-argument', 'The scorer position does not exist.')
      }
    }

    await ref.update({
      appraisalScorerPositionId: appraisalScorerPositionId ?? null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'PositionScorerSet',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: positionId,
      action: 'update',
      user,
      newValues: { appraisalScorerPositionId: appraisalScorerPositionId ?? null },
    })

    return successResponse(undefined, 'Appraisal scorer updated.')
  } catch (error) {
    handleError(error)
  }
})
