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
import { submitApprovalInternal } from '../../shared/approval'
import { computeFinalScore } from './scoring'

interface CriterionScoreInputPayload {
  criterionId: string
  score: number
  note?: string
}

const MIN_SCORE = 1
const MAX_SCORE = 10

/**
 * HR's 40% — §2.4: this callable reads the primary scores server-side to
 * compute the weighted result, but the RESPONSE never echoes them back, and
 * nothing in the frontend fetches them before this call. That is what stops
 * the 40% merely anchoring on the 60%. §7 — engages the Approval Engine
 * ('hr/appraisalV2') only here, for dualScorer only.
 */
export const submitSecondaryScores = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_SCORE_SECONDARY)

    const { appraisalId, criterionScores } = (request.data ?? {}) as {
      appraisalId?: string
      criterionScores?: CriterionScoreInputPayload[]
    }
    if (!appraisalId || !Array.isArray(criterionScores)) {
      throw new AppError('invalid-argument', 'appraisalId and criterionScores are required.')
    }

    const ref = db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Appraisal not found.')
    }
    const appraisal = snap.data()!

    if (appraisal.scorerModel !== 'dualScorer') {
      throw new AppError('failed-precondition', 'This appraisal has no secondary scoring stage.')
    }
    if (appraisal.secondaryScorerUid !== user.uid) {
      throw new AppError('permission-denied', 'Only the assigned HR scorer can submit this appraisal.')
    }
    if (appraisal.status !== 'submitted') {
      throw new AppError('failed-precondition', `This appraisal is not awaiting HR scoring (status: ${appraisal.status as string}).`)
    }

    const existing = appraisal.criterionScores as { criterionId: string; primaryScore: number | null }[]
    const providedById = new Map(criterionScores.map((c) => [c.criterionId, c]))
    const missing = existing.filter((c) => !providedById.has(c.criterionId))
    if (missing.length > 0) {
      throw new AppError('invalid-argument', `Missing scores for ${missing.length} criterion/criteria.`)
    }
    for (const c of criterionScores) {
      if (!Number.isInteger(c.score) || c.score < MIN_SCORE || c.score > MAX_SCORE) {
        throw new AppError('invalid-argument', `Score for "${c.criterionId}" must be an integer from ${MIN_SCORE} to ${MAX_SCORE}.`)
      }
    }

    const primaryScores = existing.map((c) => c.primaryScore ?? 0)
    const secondaryScores = existing.map((c) => providedById.get(c.criterionId)!.score)
    const { primaryAverage, secondaryAverage, finalScore, ratingBand } = computeFinalScore({
      primaryScores,
      secondaryScores,
      scorerModel: 'dualScorer',
    })

    const mergedCriterionScores = existing.map((c, i) => ({
      ...c,
      secondaryScore: secondaryScores[i],
      secondaryNote: providedById.get(c.criterionId)!.note?.trim() || null,
      weightedScore: primaryScores[i] * 0.6 + secondaryScores[i] * 0.4,
    }))

    await ref.update({
      criterionScores: mergedCriterionScores,
      secondarySubmittedAt: FieldValue.serverTimestamp(),
      secondarySubmittedBy: user.uid,
      primaryAverage,
      secondaryAverage,
      finalScore,
      ratingBand,
      status: 'pending',
      ...updatedFields(user.uid),
    })

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'appraisalV2',
      resourceId: appraisalId,
      requestedBy: user.uid,
      context: {
        departmentId: (appraisal.employeeDepartmentId as string | null) ?? undefined,
        requesterRoleId: user.roleId,
      },
    })
    await ref.update({ approvalRequestId })

    await recordAuditEvent({
      eventType: 'AppraisalSecondaryScoresSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      action: 'update',
      user,
      newValues: { finalScore, ratingBand, approvalRequestId },
    })

    return successResponse(undefined, 'Submitted for GM approval.')
  } catch (error) {
    handleError(error)
  }
})
