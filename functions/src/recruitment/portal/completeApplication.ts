import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  recordAuditEvent,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { notifyUsersByRole } from '../../shared/notifications'
import { ALLOWED_STAGE_TRANSITIONS, type CandidateStage } from '../helpers'
import { notifyCandidateOfStage } from '../whatsappTemplates'
import { missingRequiredSections } from './applicationForm'
import { portalActor, resolveCandidateForEdit } from './token'

/**
 * candidate_portal.md §22 — the gate between "someone typed things into a
 * browser" and "HR has a candidate to screen".
 *
 * Everything it checks is checked again nowhere else: after this call the
 * record is HR's, the candidate can no longer edit it (token.ts's
 * EDITABLE_STAGES), and the stage move goes through the same transition table
 * `moveCandidateStage` uses so the portal cannot invent a path through the
 * pipeline.
 */
const SCREENING_STAGE: CandidateStage = 'ST-02'

export const completeApplication = onCall({ region: REGION, secrets: [FONNTE_TOKEN] }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    const { candidateId, candidate, ref } = await resolveCandidateForEdit(data.applicationToken)

    const form = (candidate.applicationForm ?? null) as Record<string, unknown> | null
    const missing = form ? missingRequiredSections(form) : ['Employment form']
    if (missing.length > 0) {
      throw new AppError('failed-precondition', `Still to complete: ${missing.join(', ')}.`)
    }

    if (!candidate.discCompletedAt) {
      throw new AppError('failed-precondition', 'Complete the DISC assessment before submitting.')
    }

    // One equality filter, so no composite index — the type match happens in
    // memory rather than as a second `where`.
    const files = await db.collection(COLLECTIONS.FILES).where('resourceId', '==', candidateId).get()
    const hasCv = files.docs.some(
      (doc) => doc.data().resourceType === 'candidateDocument:cv' && doc.data().fileStatus === 'available',
    )
    if (!hasCv) {
      throw new AppError('failed-precondition', 'Upload your CV before submitting.')
    }

    const from = candidate.currentStage as CandidateStage
    if (!ALLOWED_STAGE_TRANSITIONS[from].includes(SCREENING_STAGE)) {
      throw new AppError('failed-precondition', 'This application has already moved on. Contact HR.')
    }

    const submittedAt = new Date().toISOString()
    await ref.update({
      currentStage: SCREENING_STAGE,
      stageChangedAt: FieldValue.serverTimestamp(),
      stageHistory: FieldValue.arrayUnion({
        from,
        to: SCREENING_STAGE,
        actor: 'portal',
        timestamp: submittedAt,
        reason: 'Application submitted through the candidate portal',
      }),
      submittedAt,
      updatedAt: new Date(),
      updatedBy: `portal:${candidateId}`,
    })

    await notifyUsersByRole({
      role: 'hrManager',
      module: 'hr',
      title: 'New candidate',
      message: `${candidate.fullName as string} (${candidate.candidateNumber as string}) applied for ${candidate.positionApplied as string} and completed the portal application.`,
      referenceId: candidateId,
      priority: 'medium',
    })

    // §9.5 template 1 (Initial Contact) is exactly this message — reuse it
    // rather than writing a second "we got your application" text.
    await notifyCandidateOfStage(candidate, SCREENING_STAGE)

    await recordAuditEvent({
      eventType: 'PortalApplicationSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: candidateId,
      action: 'update',
      user: portalActor(candidateId, candidate),
      previousValues: { currentStage: from },
      newValues: { currentStage: SCREENING_STAGE, submittedAt },
    })

    return successResponse({ candidateId, currentStage: SCREENING_STAGE }, 'Application submitted.')
  } catch (error) {
    return handleError(error)
  }
})
