import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, AppError, recordAuditEvent, handleError, successResponse } from '../../lib'
import { DISC_DIMENSIONS, DISC_QUESTIONS, type DiscDimension } from './discQuestions'
import { requirePayloadUnderLimit } from './guard'
import { portalActor, resolveCandidateForEdit } from './token'

/**
 * DISC assessment — candidate_portal.md §10.
 *
 * The rule the doc is emphatic about: the candidate submits *answers*, never
 * scores. Scoring happens here, `discResults` is write-denied to every client
 * in `firestore.rules`, and the result is never returned to the portal — §16
 * keeps the interpretation on the internal side only.
 */

/** Question text only — no dimension mapping, or the test answers itself. */
export const getDiscQuestions = onCall({ region: REGION }, async () => {
  try {
    const questions = DISC_QUESTIONS.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      promptId: question.promptId,
      options: question.options.map((option) => ({ id: option.id, text: option.text, textId: option.textId })),
    }))
    return successResponse({ questions }, `${questions.length} questions.`)
  } catch (error) {
    return handleError(error)
  }
})

export const submitDiscAssessment = onCall({ region: REGION }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    requirePayloadUnderLimit(data)

    const { candidateId, candidate, ref } = await resolveCandidateForEdit(data.applicationToken)

    const responses = Array.isArray(data.responses) ? (data.responses as Record<string, unknown>[]) : []
    if (responses.length !== DISC_QUESTIONS.length) {
      throw new AppError('invalid-argument', `Answer all ${DISC_QUESTIONS.length} questions before submitting.`)
    }

    const counts: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 }
    const stored = responses.map((response, index) => {
      const question = DISC_QUESTIONS[index]
      const questionId = typeof response?.questionId === 'string' ? response.questionId : question.id
      if (questionId !== question.id) {
        throw new AppError('invalid-argument', 'Those answers do not match the current questionnaire. Start again.')
      }
      const option = question.options.find((candidateOption) => candidateOption.id === response?.answer)
      if (!option) {
        throw new AppError('invalid-argument', `Pick an answer for question ${index + 1}.`)
      }
      counts[option.dimension] += 1
      return { questionId, answer: option.id }
    })

    const total = DISC_QUESTIONS.length
    const scores = Object.fromEntries(
      DISC_DIMENSIONS.map((dimension) => [dimension, Math.round((counts[dimension] / total) * 100)]),
    ) as Record<DiscDimension, number>

    // Ties break in D-I-S-C order, which is arbitrary but stable — two runs of
    // the same answers must never produce two different primary styles.
    const ranked = [...DISC_DIMENSIONS].sort((a, b) => counts[b] - counts[a])
    const completedAt = new Date().toISOString()

    await db
      .collection(COLLECTIONS.DISC_RESULTS)
      .doc(candidateId)
      .set({
        candidateId,
        candidateNumber: candidate.candidateNumber ?? null,
        outletId: candidate.outletId ?? null,
        departmentId: candidate.departmentId ?? null,
        scores,
        primaryStyle: ranked[0],
        secondaryStyle: ranked[1],
        responses: stored,
        completedAt,
        calculatedBy: 'submitDiscAssessment@v1',
      })

    // The board (candidate_portal.md §17) shows "D/C" per row. Denormalised
    // here rather than joined per candidate: discResults is read-restricted, so
    // a leader who may see the board could not resolve the join anyway.
    await ref.update({
      discCompletedAt: completedAt,
      discSummary: `${ranked[0]}/${ranked[1]}`,
      updatedAt: new Date(),
      updatedBy: `portal:${candidateId}`,
    })

    await recordAuditEvent({
      eventType: 'PortalDiscSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: candidateId,
      action: 'create',
      user: portalActor(candidateId, candidate),
      newValues: { primaryStyle: ranked[0], secondaryStyle: ranked[1] },
    })

    // No scores in the response: §16 keeps the interpretation internal.
    return successResponse({ candidateId, completedAt }, 'Assessment complete.')
  } catch (error) {
    return handleError(error)
  }
})
