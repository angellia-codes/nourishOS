import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  recordAuditEvent,
  newDocumentBaseFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { CANDIDATE_SOURCES, CANDIDATE_STAGES, allocateCandidateNumber, requireOneOf } from '../helpers'
import { notifyApplicationStarted } from '../whatsappTemplates'
import { issueToken, portalActor } from './token'
import { normalizeEmail, normalizePhone, portalText, requireNotDuplicate, requirePayloadUnderLimit } from './guard'

/**
 * candidate_portal.md §15 Screens 2–3, collapsed into one call: picking a
 * position and identifying yourself is the whole "account creation" step, since
 * candidates have no Firebase Auth account (see ./token.ts).
 *
 * The candidate lands in the same `candidates` collection HR already works —
 * ST-01 Applied, one stage-history entry, a real candidateNumber — so nothing
 * downstream needs to know whether a record arrived through the portal or was
 * typed in by HR. `appliedVia` is the only tell, and it exists for reporting,
 * not for branching.
 */
export const startApplication = onCall({ region: REGION, secrets: [FONNTE_TOKEN] }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    requirePayloadUnderLimit(data)

    const requisitionId = portalText(data.requisitionId, 'Position', 200)
    const requisitionSnap = await db.collection(COLLECTIONS.RECRUITMENTS).doc(requisitionId).get()
    const requisition = requisitionSnap.data()
    // Same rule createCandidate enforces: no candidate without an approved
    // requisition. A closed vacancy must not keep taking applications.
    if (!requisitionSnap.exists || requisition?.status !== 'approved' || requisition?.vacancyStage === 'filled') {
      throw new AppError('failed-precondition', 'That position is no longer open. Pick another from the list.')
    }

    const fullName = portalText(data.fullName, 'Full name', 120)
    const phone = portalText(data.phone, 'Phone number', 40)
    const phoneDigits = normalizePhone(phone)
    if (phoneDigits.length < 9) {
      throw new AppError('invalid-argument', 'Enter a valid mobile number, e.g. 0812xxxxxxx.')
    }
    const email = normalizeEmail(data.email)
    const source = requireOneOf(data.source, CANDIDATE_SOURCES, 'How you heard about us')

    await requireNotDuplicate(phoneDigits, requisitionId)

    const candidateNumber = await allocateCandidateNumber()
    const { token, portalTokenHash, portalTokenExpiresAt } = issueToken()
    const now = new Date().toISOString()

    const ref = db.collection(COLLECTIONS.CANDIDATES).doc()
    await ref.set({
      candidateNumber,
      requisitionId,
      outletId: requisition.outletId,
      departmentId: requisition.departmentId,
      fullName,
      phone,
      phoneDigits,
      email,
      positionApplied: requisition.position,
      source,
      appliedVia: 'portal',
      applicationDate: todayIso(),
      currentStage: CANDIDATE_STAGES[0],
      stageChangedAt: FieldValue.serverTimestamp(),
      stageHistory: [{ from: null, to: CANDIDATE_STAGES[0], actor: 'portal', timestamp: now }],
      hrInterviewScore: null,
      userInterviewScore: null,
      joinDate: null,
      employeeId: null,
      notes: null,
      portalTokenHash,
      portalTokenExpiresAt,
      applicationForm: null,
      discCompletedAt: null,
      submittedAt: null,
      ...newDocumentBaseFields('portal', 'active'),
    })

    await recordAuditEvent({
      eventType: 'PortalApplicationStarted',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: ref.id,
      action: 'create',
      user: portalActor(ref.id, { fullName, email, outletId: requisition.outletId, departmentId: requisition.departmentId }),
      newValues: { candidateNumber, requisitionId, position: requisition.position },
    })

    // Best-effort, after the write — the candidate can carry on in the browser
    // without it, but the link is how they come back on another device.
    await notifyApplicationStarted({ fullName, phone, position: requisition.position as string, token })

    return successResponse(
      { candidateId: ref.id, candidateNumber, applicationToken: token, position: requisition.position },
      'Application started.',
    )
  } catch (error) {
    return handleError(error)
  }
})
