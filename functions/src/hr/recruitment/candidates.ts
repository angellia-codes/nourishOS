import { onCall } from 'firebase-functions/v2/https'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import {
  ALLOWED_STAGE_TRANSITIONS,
  CANDIDATE_SOURCES,
  CANDIDATE_STAGES,
  STAGE_LABELS,
  allocateCandidateNumber,
  requireIsoDate,
  requireOneOf,
  requireRecruitmentPermission,
  requireText,
  type CandidateStage,
} from './helpers'
import { createOnboardingChecklistInternal } from './onboarding'

/**
 * Candidate pipeline — HR_OPERATIONS.md §9.4 (stages ST-01…ST-08), §12.3
 * (fields) and Epic E04.
 *
 * Every candidate traces back to an approved requisition (employee-requisition
 * .md §10 criterion 6) — that is the whole point of requiring a requisition
 * first, so it is enforced server-side rather than by hiding the button.
 *
 * The §9.5 WhatsApp templates that fire on each stage change are not wired:
 * there is no Fonnte adapter in this codebase. Stage changes notify in-app
 * instead, and the stage table below is where those templates would hook in.
 */

const OFFER_STAGE: CandidateStage = 'ST-05'
const HIRED_STAGE: CandidateStage = 'ST-06'

/** Interview stages, whose scores land on distinct candidate fields (§12.3). */
export const HR_INTERVIEW_STAGE: CandidateStage = 'ST-03'
export const USER_INTERVIEW_STAGE: CandidateStage = 'ST-04'

/**
 * Indonesian mobile numbers are written three ways for the same line — 0811…,
 * +62811… and 62811… — so the duplicate check compares a canonical form:
 * digits only, with the local leading 0 and the 00 international prefix both
 * rewritten to the 62 country code. Without this, the same applicant applying
 * twice with a differently-formatted number reads as two people.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2) // 0062… → 62…
  if (digits.startsWith('0')) return `62${digits.slice(1)}` // 0811… → 62811…
  return digits
}

export const createCandidate = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_CREATE)

    const data = (request.data ?? {}) as Record<string, unknown>

    const requisitionId = requireText(data.requisitionId, 'Requisition', 200)
    const requisitionSnap = await db.collection(COLLECTIONS.RECRUITMENTS).doc(requisitionId).get()
    if (!requisitionSnap.exists) {
      throw new AppError('not-found', 'That requisition no longer exists.')
    }
    const requisition = requisitionSnap.data()!
    if (requisition.status !== 'approved') {
      throw new AppError(
        'failed-precondition',
        'Candidates can only be added to an approved requisition. Get the manpower request approved first.',
      )
    }

    const fullName = requireText(data.fullName, 'Full name', 120)
    const phone = requireText(data.phone, 'Phone', 40)
    const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null

    // E04-US01: "duplicate check on phone number warns HR before save". Server
    // side that is a refusal the client can override deliberately, not a hint —
    // the same person genuinely re-applying is a real case.
    if (data.allowDuplicate !== true) {
      const digits = normalizePhone(phone)
      const existing = await db
        .collection(COLLECTIONS.CANDIDATES)
        .where('phoneDigits', '==', digits)
        .limit(1)
        .get()
      if (!existing.empty) {
        throw new AppError(
          'already-exists',
          `A candidate with this phone number already exists (${existing.docs[0].data().candidateNumber}). Confirm to add anyway.`,
        )
      }
    }

    const candidateNumber = await allocateCandidateNumber()
    const applicationDate = data.applicationDate ? requireIsoDate(data.applicationDate, 'Application date') : todayIso()
    const now = new Date().toISOString()

    const ref = db.collection(COLLECTIONS.CANDIDATES).doc()
    await ref.set({
      candidateNumber,
      requisitionId,
      outletId: requisition.outletId,
      departmentId: requisition.departmentId,
      fullName,
      phone,
      phoneDigits: normalizePhone(phone),
      email,
      positionApplied: requireText(data.positionApplied ?? requisition.position, 'Position applied', 120),
      source: requireOneOf(data.source, CANDIDATE_SOURCES, 'Source'),
      applicationDate,
      currentStage: CANDIDATE_STAGES[0],
      stageChangedAt: FieldValue.serverTimestamp(),
      stageHistory: [{ from: null, to: CANDIDATE_STAGES[0], actor: user.uid, timestamp: now }],
      hrInterviewScore: null,
      userInterviewScore: null,
      joinDate: null,
      employeeId: null,
      notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null,
      ...newDocumentBaseFields(user.uid, 'active'),
    })

    await recordAuditEvent({
      eventType: 'CandidateCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { candidateNumber, requisitionId, fullName },
    })

    return successResponse({ candidateId: ref.id, candidateNumber }, `${candidateNumber} added to the pipeline.`)
  } catch (error) {
    return handleError(error)
  }
})

export const updateCandidate = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const data = (request.data ?? {}) as Record<string, unknown>
    const candidateId = requireText(data.candidateId, 'candidateId', 200)

    const ref = db.collection(COLLECTIONS.CANDIDATES).doc(candidateId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That candidate no longer exists.')
    }
    const previous = snap.data()!

    const phone = requireText(data.phone, 'Phone', 40)
    const fields = {
      fullName: requireText(data.fullName, 'Full name', 120),
      phone,
      phoneDigits: normalizePhone(phone),
      email: typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null,
      positionApplied: requireText(data.positionApplied, 'Position applied', 120),
      source: requireOneOf(data.source, CANDIDATE_SOURCES, 'Source'),
      notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null,
    }

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'CandidateUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: candidateId,
      action: 'update',
      user,
      previousValues: { fullName: previous.fullName, phone: previous.phone },
      newValues: fields,
    })

    return successResponse({ candidateId }, 'Candidate updated.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * The one write that moves the pipeline — E04-US02.
 *
 * Transitions are validated against ALLOWED_STAGE_TRANSITIONS (a funnel, not a
 * free-for-all), stageHistory is append-only, and stageChangedAt is reset so
 * "days in current stage" is derived rather than stored and drifting.
 *
 * Reaching ST-06 does three extra things: it counts the hire against the
 * requisition, completes that requisition when the last opening is filled, and
 * generates the onboarding checklist. It deliberately does NOT create the
 * employee record — candidate data has none of the required employment fields
 * (NIK, contract type, probation), so HR confirms those on the employee form,
 * which is pre-filled from the candidate.
 */
export const moveCandidateStage = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const { candidateId, toStage, joinDate, reason } = (request.data ?? {}) as {
      candidateId?: string
      toStage?: string
      joinDate?: string
      reason?: string
    }

    const id = requireText(candidateId, 'candidateId', 200)
    const target = requireOneOf(toStage, CANDIDATE_STAGES, 'Stage')

    const ref = db.collection(COLLECTIONS.CANDIDATES).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That candidate no longer exists.')
    }
    const candidate = snap.data()!
    const from = candidate.currentStage as CandidateStage

    if (from === target) {
      throw new AppError('failed-precondition', `The candidate is already at ${STAGE_LABELS[target]}.`)
    }
    if (!ALLOWED_STAGE_TRANSITIONS[from].includes(target)) {
      throw new AppError(
        'failed-precondition',
        `A candidate cannot move from ${STAGE_LABELS[from]} to ${STAGE_LABELS[target]}.`,
      )
    }

    // A hire needs a join date — it is what the onboarding tasks are due against
    // and what time-to-hire is measured to.
    const confirmedJoinDate = target === HIRED_STAGE ? requireIsoDate(joinDate, 'Join date') : null

    const entry = {
      from,
      to: target,
      actor: user.uid,
      timestamp: new Date().toISOString(),
      reason: reason?.trim() || null,
    }

    await ref.update({
      currentStage: target,
      stageChangedAt: FieldValue.serverTimestamp(),
      stageHistory: FieldValue.arrayUnion(entry),
      ...(confirmedJoinDate ? { joinDate: confirmedJoinDate } : {}),
      ...(target === 'ST-07' || target === 'ST-08' ? { status: 'closed' } : {}),
      ...updatedFields(user.uid),
    })

    let onboardingChecklistId: string | null = null

    if (target === HIRED_STAGE) {
      onboardingChecklistId = await recordHire(candidate, id, confirmedJoinDate!, user)
    }

    // The requisition owner asked for this headcount; they are the one who
    // needs to know it moved — HR is already looking at the board.
    if (target === HIRED_STAGE || target === OFFER_STAGE) {
      const requisitionSnap = await db.collection(COLLECTIONS.RECRUITMENTS).doc(candidate.requisitionId).get()
      const requestedBy = requisitionSnap.data()?.createdBy as string | undefined
      if (requestedBy && requestedBy !== user.uid) {
        await sendNotificationInternal({
          type: 'alert',
          title: target === HIRED_STAGE ? 'Candidate hired' : 'Offer extended',
          message: `${candidate.fullName} (${candidate.candidateNumber}) is now at ${STAGE_LABELS[target]}.`,
          module: 'hr',
          priority: 'medium',
          recipientUid: requestedBy,
          referenceModule: 'hr',
          referenceId: id,
        })
      }
    }

    await recordAuditEvent({
      eventType: 'CandidateStageChanged',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: id,
      action: 'update',
      user,
      previousValues: { currentStage: from },
      newValues: { currentStage: target, joinDate: confirmedJoinDate, onboardingChecklistId },
    })

    return successResponse(
      { candidateId: id, currentStage: target, onboardingChecklistId },
      `Moved to ${STAGE_LABELS[target]}.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Counts a hire against its requisition and opens the onboarding checklist.
 * The requisition is updated in a transaction because two hires against the
 * last opening would otherwise both read filledCount and both under-count.
 * `recordAuditEvent` fires after the transaction commits, same as every other
 * audit call-site — never inside the transaction itself.
 */
async function recordHire(
  candidate: FirebaseFirestore.DocumentData,
  candidateId: string,
  joinDate: string,
  user: AuthedUser,
): Promise<string> {
  const requisitionRef = db.collection(COLLECTIONS.RECRUITMENTS).doc(candidate.requisitionId)
  let completed = false
  let completedFilledCount = 0
  let completedOpenings = 0

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(requisitionRef)
    if (!snap.exists) return
    const requisition = snap.data()!

    const filledCount = (requisition.filledCount ?? 0) + 1
    const openings = (requisition.openings ?? 1) as number
    const complete = filledCount >= openings

    tx.update(requisitionRef, {
      filledCount,
      hiredCandidateIds: FieldValue.arrayUnion(candidateId),
      vacancyStage: complete ? 'filled' : 'offering',
      ...(complete ? { status: 'completed', completedAt: Timestamp.now() } : {}),
      updatedAt: Timestamp.now(),
      updatedBy: user.uid,
    })

    completed = complete
    completedFilledCount = filledCount
    completedOpenings = openings
  })

  if (completed) {
    await recordAuditEvent({
      eventType: 'RequisitionCompleted',
      category: 'HR',
      module: 'hr',
      resourceType: 'requisition',
      resourceId: candidate.requisitionId,
      action: 'update',
      user,
      newValues: {
        status: 'completed',
        vacancyStage: 'filled',
        filledCount: completedFilledCount,
        openings: completedOpenings,
      },
    })
  }

  return createOnboardingChecklistInternal({
    candidateId,
    candidateName: candidate.fullName,
    requisitionId: candidate.requisitionId,
    outletId: candidate.outletId,
    departmentId: candidate.departmentId,
    joinDate,
    actorUid: user.uid,
  })
}
