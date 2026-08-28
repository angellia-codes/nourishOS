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
 * §5 — the correction path for a mis-scored senior (soloScorer) appraisal,
 * which has no approval step and so no rejected path of its own. Also usable
 * on a dualScorer appraisal at any pre-acknowledgement stage. Resets scoring
 * back to draft; any prior approvalRequestId is left as a historical
 * reference rather than cancelled/deleted (submitSecondaryScores issues a
 * fresh one on re-submission — approval_engine.md's cancel action only
 * applies before any step has been actioned, which doesn't hold for an
 * already-approved request).
 */
export const reopenAppraisal = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_REOPEN)

    const { appraisalId, reason } = (request.data ?? {}) as { appraisalId?: string; reason?: string }
    if (!appraisalId || !reason?.trim()) {
      throw new AppError('invalid-argument', 'appraisalId and reason are required.')
    }

    const ref = db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Appraisal not found.')
    }
    const appraisal = snap.data()!

    if (appraisal.status === 'completed') {
      throw new AppError('failed-precondition', 'This appraisal has already been acknowledged and can no longer be reopened.')
    }

    const resetCriterionScores = (appraisal.criterionScores as { criterionId: string }[]).map((c) => ({
      criterionId: c.criterionId,
      primaryScore: null,
      secondaryScore: null,
      weightedScore: null,
      primaryNote: null,
      secondaryNote: null,
    }))

    await ref.update({
      criterionScores: resetCriterionScores,
      primarySubmittedAt: null,
      primarySubmittedBy: null,
      secondarySubmittedAt: null,
      secondarySubmittedBy: null,
      primaryAverage: null,
      secondaryAverage: null,
      finalScore: null,
      ratingBand: null,
      approvalRequestId: null,
      consequenceTaskId: null,
      status: 'draft',
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AppraisalReopened',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      action: 'update',
      user,
      metadata: { reason: reason.trim(), previousStatus: appraisal.status },
    })

    return successResponse(undefined, 'Appraisal reopened for re-scoring.')
  } catch (error) {
    handleError(error)
  }
})
