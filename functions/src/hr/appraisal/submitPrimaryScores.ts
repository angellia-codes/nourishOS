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
import { sendNotificationInternal } from '../../shared/notifications'
import { computeFinalScore } from './scoring'
import { fireAppraisalConsequences } from './consequences'

interface CriterionScoreInputPayload {
  criterionId: string
  score: number
  note?: string
}

const MIN_SCORE = 1
const MAX_SCORE = 10

/**
 * §7/§5 — Department Head (dualScorer) or General Manager (soloScorer).
 * dualScorer locks primary and moves draft -> submitted, awaiting HR's 40%.
 * soloScorer computes the final score in the same call and moves
 * draft -> approved directly (§5: solo skips submitted/pending entirely).
 */
export const submitPrimaryScores = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_SCORE_PRIMARY)

    const { appraisalId, criterionScores, overallComment } = (request.data ?? {}) as {
      appraisalId?: string
      criterionScores?: CriterionScoreInputPayload[]
      overallComment?: string
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

    if (appraisal.primaryScorerUid !== user.uid) {
      throw new AppError('permission-denied', 'Only the assigned primary scorer can submit this appraisal.')
    }
    if (appraisal.status !== 'draft') {
      throw new AppError('failed-precondition', `This appraisal is already ${appraisal.status as string}.`)
    }

    const existing = appraisal.criterionScores as { criterionId: string }[]
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

    const mergedCriterionScores = existing.map((c) => {
      const input = providedById.get(c.criterionId)!
      return { ...c, primaryScore: input.score, primaryNote: input.note?.trim() || null }
    })

    const update: Record<string, unknown> = {
      criterionScores: mergedCriterionScores,
      primarySubmittedAt: FieldValue.serverTimestamp(),
      primarySubmittedBy: user.uid,
      overallComment: overallComment?.trim() || null,
      ...updatedFields(user.uid),
    }

    if (appraisal.scorerModel === 'soloScorer') {
      const { primaryAverage, finalScore, ratingBand } = computeFinalScore({
        primaryScores: mergedCriterionScores.map((c) => c.primaryScore as number),
        secondaryScores: [],
        scorerModel: 'soloScorer',
      })
      update.criterionScores = mergedCriterionScores.map((c) => ({ ...c, weightedScore: c.primaryScore }))
      update.primaryAverage = primaryAverage
      update.secondaryAverage = null
      update.finalScore = finalScore
      update.ratingBand = ratingBand
      update.status = 'approved'

      await ref.update(update)

      const { consequenceTaskId } = await fireAppraisalConsequences({
        appraisalId,
        employeeId: appraisal.employeeId as string,
        finalScore,
        ratingBand,
        scorerModel: 'soloScorer',
      })
      if (consequenceTaskId) {
        await recordAuditEvent({
          eventType: 'AppraisalConsequenceTaskCreated',
          category: 'HR',
          module: 'hr',
          resourceType: 'appraisal',
          resourceId: appraisalId,
          action: 'update',
          user,
          metadata: { consequenceTaskId, finalScore },
        })
      }
    } else {
      update.status = 'submitted'
      await ref.update(update)

      if (appraisal.secondaryScorerUid) {
        await sendNotificationInternal({
          type: 'alert',
          title: 'Primary Score Submitted',
          message: `Primary scoring is complete for ${appraisal.periodLabel as string}. Your 40% is next.`,
          module: 'hr',
          priority: 'medium',
          recipientUid: appraisal.secondaryScorerUid as string,
          referenceModule: 'hr',
          referenceId: appraisalId,
        })
      }
    }

    await recordAuditEvent({
      eventType: 'AppraisalPrimaryScoresSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      action: 'update',
      user,
      newValues: { scorerModel: appraisal.scorerModel },
    })

    return successResponse(
      undefined,
      appraisal.scorerModel === 'soloScorer' ? 'Scoring closed.' : 'Submitted — awaiting HR Manager scoring.',
    )
  } catch (error) {
    handleError(error)
  }
})
