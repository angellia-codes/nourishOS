import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, handleError, successResponse } from '../../lib'
import { STAGE_LABELS, type CandidateStage } from '../helpers'
import { missingRequiredSections } from './applicationForm'
import { resolveCandidateByToken } from './token'

/**
 * candidate_portal.md §16 — the candidate's own view of their application.
 *
 * The projection is the point. Interview scores, interviewer notes, the DISC
 * scores and every internal comment stay out of the response; the candidate
 * sees where they are in the process and what they still owe us, nothing else.
 */

/** The stages a candidate is shown, in order. Rejected/withdrawn are reported as an outcome instead. */
const VISIBLE_STAGES: CandidateStage[] = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06']

export const getApplicationStatus = onCall({ region: REGION }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    const { candidateId, candidate } = await resolveCandidateByToken(data.applicationToken)

    const form = (candidate.applicationForm ?? null) as Record<string, unknown> | null
    const files = await db.collection(COLLECTIONS.FILES).where('resourceId', '==', candidateId).get()
    const documents = files.docs
      .map((doc) => doc.data())
      .filter((file) => String(file.resourceType ?? '').startsWith('candidateDocument:') && file.fileStatus === 'available')
      .map((file) => ({
        documentType: String(file.resourceType).replace('candidateDocument:', ''),
        fileName: file.originalName as string,
      }))

    const stage = candidate.currentStage as CandidateStage
    const submittedAt = (candidate.submittedAt ?? null) as string | null

    // Once the application is actually finished (form + DISC both done, per
    // §7 AC-1's completeApplication gate), the candidate must not be able to
    // see where they sit in the recruitment pipeline — stripped here, not
    // just hidden client-side, since this callable is unauthenticated and its
    // JSON is trivially inspectable.
    const stageDetail = submittedAt
      ? {}
      : {
          stage,
          stageLabel: STAGE_LABELS[stage],
          stageIndex: VISIBLE_STAGES.indexOf(stage),
          stages: VISIBLE_STAGES.map((value) => ({ stage: value, label: STAGE_LABELS[value] })),
          closed: stage === 'ST-07' || stage === 'ST-08',
        }

    return successResponse(
      {
        candidateNumber: candidate.candidateNumber,
        fullName: candidate.fullName,
        position: candidate.positionApplied,
        ...stageDetail,
        submittedAt,
        steps: {
          form: form ? missingRequiredSections(form).length === 0 : false,
          disc: Boolean(candidate.discCompletedAt),
          cv: documents.some((document) => document.documentType === 'cv'),
        },
        missing: form ? missingRequiredSections(form) : ['Employment form'],
        documents,
        applicationForm: form,
      },
      'OK',
    )
  } catch (error) {
    return handleError(error)
  }
})
