import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { createTaskInternal } from '../../shared/tasks'
import { resolveActiveUidByRole } from './createAppraisal'
import type { RatingBand, ScorerModel } from './types'

const CONSEQUENCE_THRESHOLD = 60
const SYSTEM_UID = 'system:appraisalEngine'

/**
 * §9 — fired once, on `approved`, from wherever that transition actually
 * happens: submitSecondaryScores for dualScorer (which computes the final
 * score itself, with no separate approval-resolved step to hang this off of
 * since GM approval only gates when the score becomes visible, not whether
 * it was scored) or submitPrimaryScores for soloScorer (draft -> approved
 * directly, §5). Shared here so both call sites — and the 'hr/appraisalV2'
 * approval-resolved handler in index.ts — fire the exact same consequence,
 * once.
 */
export async function fireAppraisalConsequences(input: {
  appraisalId: string
  employeeId: string
  finalScore: number
  ratingBand: RatingBand
  scorerModel: ScorerModel
}): Promise<{ consequenceTaskId: string | null }> {
  if (input.finalScore >= CONSEQUENCE_THRESHOLD) {
    return { consequenceTaskId: null }
  }

  await db
    .collection(COLLECTIONS.APPRAISALS)
    .doc(input.appraisalId)
    .collection('confidential')
    .doc('recommendation')
    .set({
      employeeId: input.employeeId,
      finalScore: input.finalScore,
      ratingBand: input.ratingBand,
      // Task wording is fixed and deliberate (§9): the score prompts human
      // judgement, it never substitutes for it — Indonesian labour law
      // requires documented cause for a surat peringatan, so this never
      // says "Issue SP1."
      recommendation:
        'This appraisal scored below 60. Review the criterion scores and reviewer notes and determine ' +
        'whether formal action is warranted.',
      createdAt: FieldValue.serverTimestamp(),
    })

  // dualScorer -> HR Manager; soloScorer -> Director, since the HR Manager
  // may herself be the subject (Level I).
  const recipientRole = input.scorerModel === 'dualScorer' ? 'hrManager' : 'director'
  const recipientUid = await resolveActiveUidByRole(recipientRole)
  if (!recipientUid) {
    return { consequenceTaskId: null }
  }

  const taskId = await createTaskInternal({
    title: 'Review and determine whether formal action is warranted.',
    taskType: 'performanceReview',
    sourceModule: 'hr',
    referenceId: input.appraisalId,
    assignedTo: recipientUid,
    assignedBy: SYSTEM_UID,
    priority: 'high',
    tags: ['appraisal', 'consequence'],
  })

  await db.collection(COLLECTIONS.APPRAISALS).doc(input.appraisalId).update({ consequenceTaskId: taskId })

  return { consequenceTaskId: taskId }
}
