import { onCall } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { createCalendarEventInternal } from '../shared/calendar'
import { createTaskInternal } from '../shared/tasks'
import { sendNotificationInternal, whatsAppTargetForUid } from '../shared/notifications'
import { INTERVIEWER_ROLES, STAGE_LABELS, requireRecruitmentPermission, requireText, type CandidateStage } from './helpers'
import { GM_INTERVIEW_STAGE, HR_INTERVIEW_STAGE, USER_INTERVIEW_STAGE } from './candidates'
import { notifyInterviewScheduled } from './whatsappTemplates'
import { FONNTE_TOKEN, GOOGLE_CALENDAR_SA_KEY } from '../lib/secrets'

/**
 * Interview stage — HR_OPERATIONS.md §9.4-F05 (scheduling linked to the
 * Calendar Service) and F07 (notes + a 1–5 score per stage).
 *
 * Scheduling writes three things: the interview record, a calendarEvents doc
 * (so it shows on the executive Calendar, and so the existing conflict check
 * catches double-booked interviewers), and a task for the interviewer. The
 * calendar event is created through createCalendarEventInternal rather than by
 * calling the callable — same internal-helper split the approval, task and
 * notification engines use.
 *
 * §9.5's template 2 (Interview Invitation) fires here for both the candidate
 * and the interviewer; template 3 (the 24-hour reminder) is the separate
 * `sendInterviewReminders` scheduled job in this folder.
 */

const INTERVIEW_STAGES: readonly CandidateStage[] = [HR_INTERVIEW_STAGE, USER_INTERVIEW_STAGE, GM_INTERVIEW_STAGE]
const DEFAULT_DURATION_MINUTES = 45

// Both secrets: the WhatsApp invitation (§9.5) and the calendar event this
// writes through createCalendarEventInternal, which now pushes to Google.
const SCHEDULE_SECRETS = [FONNTE_TOKEN, GOOGLE_CALENDAR_SA_KEY]
export const scheduleInterview = onCall({ region: REGION, secrets: SCHEDULE_SECRETS }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const data = (request.data ?? {}) as Record<string, unknown>
    const candidateId = requireText(data.candidateId, 'candidateId', 200)
    const interviewerUid = requireText(data.interviewerUid, 'Interviewer', 200)
    const location = requireText(data.location, 'Location', 200)

    const stage = data.stage as CandidateStage
    if (!INTERVIEW_STAGES.includes(stage)) {
      throw new AppError('invalid-argument', 'An interview belongs to the HR Interview, User Interview, or GM Interview stage.')
    }

    const durationMinutes = Number(data.durationMinutes ?? DEFAULT_DURATION_MINUTES)
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      throw new AppError('invalid-argument', 'Duration must be between 15 and 480 minutes.')
    }

    const scheduledAt = new Date(String(data.scheduledAt ?? ''))
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new AppError('invalid-argument', 'scheduledAt must be a valid ISO 8601 instant.')
    }

    const candidateSnap = await db.collection(COLLECTIONS.CANDIDATES).doc(candidateId).get()
    if (!candidateSnap.exists) {
      throw new AppError('not-found', 'That candidate no longer exists.')
    }
    const candidate = candidateSnap.data()!

    const interviewerSnap = await db.collection(COLLECTIONS.USERS).doc(interviewerUid).get()
    if (!interviewerSnap.exists || interviewerSnap.data()?.status !== 'active') {
      throw new AppError('invalid-argument', 'Pick an active user as the interviewer.')
    }
    if (!INTERVIEWER_ROLES.includes(interviewerSnap.data()?.roleId)) {
      throw new AppError('invalid-argument', 'Pick a leader or manager as the interviewer.')
    }

    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000)
    const interviewRef = db.collection(COLLECTIONS.INTERVIEWS).doc()

    // The interviewer plus the scheduler are the participants; the candidate is
    // external and has no uid, so they are named in the title instead.
    const participants = [...new Set([interviewerUid, user.uid])]
    const { eventId } = await createCalendarEventInternal(
      {
        title: `${STAGE_LABELS[stage]} — ${candidate.fullName as string}`,
        description: `${candidate.candidateNumber as string} · ${candidate.positionApplied as string}`,
        eventType: 'recruitmentInterview',
        startAt: scheduledAt.toISOString(),
        endAt: endAt.toISOString(),
        participants,
        location,
        priority: 'medium',
        // The interviewer's own diary conflict is worth surfacing, but the
        // client resubmits with an override the same way the calendar form does.
        overrideReason: typeof data.overrideReason === 'string' ? data.overrideReason : undefined,
      },
      user,
      { sourceModule: 'hr', referenceId: interviewRef.id },
    )

    await interviewRef.set({
      candidateId,
      candidateName: candidate.fullName,
      requisitionId: candidate.requisitionId,
      outletId: candidate.outletId,
      departmentId: candidate.departmentId,
      stage,
      interviewerUid,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      durationMinutes,
      location,
      calendarEventId: eventId,
      outcome: 'pending',
      score: null,
      notes: null,
      ...newDocumentBaseFields(user.uid, 'scheduled'),
    })

    await createTaskInternal({
      title: `${STAGE_LABELS[stage]}: ${candidate.fullName as string}`,
      description: `Interview at ${location} on ${scheduledAt.toISOString()}. Record the score and notes afterwards.`,
      taskType: 'recruitment',
      sourceModule: 'hr',
      referenceId: interviewRef.id,
      assignedTo: interviewerUid,
      assignedBy: user.uid,
      priority: 'high',
      dueDate: scheduledAt.toISOString(),
      tags: ['recruitment', 'interview'],
    })

    // §9.5 template 2 — candidate and interviewer, after both writes land.
    await notifyInterviewScheduled({
      candidate,
      stageLabel: STAGE_LABELS[stage],
      scheduledAt,
      location,
      interviewerName: (interviewerSnap.data()?.displayName as string | undefined) ?? 'our team',
      interviewerPhone: await whatsAppTargetForUid(interviewerUid),
    })

    await recordAuditEvent({
      eventType: 'InterviewScheduled',
      category: 'HR',
      module: 'hr',
      resourceType: 'interview',
      resourceId: interviewRef.id,
      action: 'create',
      user,
      newValues: { candidateId, stage, interviewerUid, scheduledAt: scheduledAt.toISOString(), calendarEventId: eventId },
    })

    return successResponse({ interviewId: interviewRef.id, calendarEventId: eventId }, 'Interview scheduled.')
  } catch (error) {
    return handleError(error)
  }
})

/** candidate_portal.md §13 — the six scorecard criteria, each 1–5. */
export const SCORECARD_CRITERIA = [
  'communication',
  'attitude',
  'technicalKnowledge',
  'teamwork',
  'problemSolving',
  'cultureFit',
] as const

export const INTERVIEW_RECOMMENDATIONS = ['proceed', 'hold', 'reject'] as const
export type InterviewRecommendation = (typeof INTERVIEW_RECOMMENDATIONS)[number]

/**
 * Returns the validated scorecard, or null when the caller sent none —
 * partially-filled scorecards are refused rather than averaged over the
 * criteria that happen to be present, which would flatter or punish a
 * candidate depending on which boxes the interviewer skipped.
 */
function parseScorecard(criteria: Record<string, unknown> | undefined): Record<string, number> | null {
  if (!criteria || typeof criteria !== 'object') return null
  const provided = SCORECARD_CRITERIA.filter((key) => criteria[key] !== undefined && criteria[key] !== null)
  if (provided.length === 0) return null
  if (provided.length !== SCORECARD_CRITERIA.length) {
    throw new AppError('invalid-argument', 'Score every criterion, or leave the whole scorecard blank.')
  }

  const parsed: Record<string, number> = {}
  for (const key of SCORECARD_CRITERIA) {
    const value = Number(criteria[key])
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new AppError('invalid-argument', `${key} must be a whole number from 1 to 5.`)
    }
    parsed[key] = value
  }
  return parsed
}

/**
 * 9.4-F07: score 1–5 plus notes, recorded once the interview has happened. The
 * score is mirrored onto the candidate (hrInterviewScore / userInterviewScore
 * per §12.3) so the board can rank without joining every interview record.
 */
export const recordInterviewOutcome = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { interviewId, outcome, score, notes, criteria, strengths, concerns, recommendation } = (request.data ??
      {}) as {
      interviewId?: string
      outcome?: string
      score?: number
      notes?: string
      criteria?: Record<string, unknown>
      strengths?: string
      concerns?: string
      recommendation?: string
    }

    const id = requireText(interviewId, 'interviewId', 200)
    if (outcome !== 'pass' && outcome !== 'fail' && outcome !== 'noShow') {
      throw new AppError('invalid-argument', 'Outcome must be pass, fail, or noShow.')
    }

    const ref = db.collection(COLLECTIONS.INTERVIEWS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That interview no longer exists.')
    }
    const interview = snap.data()!

    // The interviewer records their own outcome without needing the module
    // permission — they were assigned the task, that is the authorization.
    if (interview.interviewerUid !== user.uid) {
      requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)
    }
    if (interview.outcome !== 'pending') {
      throw new AppError('failed-precondition', 'That interview already has a recorded outcome.')
    }

    // A no-show has nothing to score; a completed interview must be scored.
    // candidate_portal.md §13 adds the six-criterion scorecard on top of the
    // single §9.4-F07 score: when the criteria are filled in they *are* the
    // score (their mean), so the board keeps ranking on one number and the
    // older single-score clients keep working untouched.
    let recordedScore: number | null = null
    let recordedCriteria: Record<string, number> | null = null

    if (outcome !== 'noShow') {
      recordedCriteria = parseScorecard(criteria)
      if (recordedCriteria) {
        const values = Object.values(recordedCriteria)
        recordedScore = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      } else {
        recordedScore = Number(score)
        if (!Number.isInteger(recordedScore) || recordedScore < 1 || recordedScore > 5) {
          throw new AppError('invalid-argument', 'Score must be a whole number from 1 to 5.')
        }
      }
    }

    if (recommendation !== undefined && !INTERVIEW_RECOMMENDATIONS.includes(recommendation as InterviewRecommendation)) {
      throw new AppError('invalid-argument', `Recommendation must be one of: ${INTERVIEW_RECOMMENDATIONS.join(', ')}.`)
    }

    await ref.update({
      outcome,
      score: recordedScore,
      criteria: recordedCriteria,
      strengths: strengths?.trim() || null,
      concerns: concerns?.trim() || null,
      recommendation: (recommendation as InterviewRecommendation | undefined) ?? null,
      notes: notes?.trim() || null,
      status: 'completed',
      ...updatedFields(user.uid),
    })

    if (recordedScore !== null) {
      const field =
        interview.stage === HR_INTERVIEW_STAGE
          ? 'hrInterviewScore'
          : interview.stage === USER_INTERVIEW_STAGE
            ? 'userInterviewScore'
            : 'gmInterviewScore'
      await db
        .collection(COLLECTIONS.CANDIDATES)
        .doc(interview.candidateId)
        .update({ [field]: recordedScore, ...updatedFields(user.uid) })
    }

    await recordAuditEvent({
      eventType: 'InterviewOutcomeRecorded',
      category: 'HR',
      module: 'hr',
      resourceType: 'interview',
      resourceId: id,
      action: 'update',
      user,
      newValues: { outcome, score: recordedScore, recommendation: recommendation ?? null },
    })

    return successResponse({ interviewId: id, score: recordedScore }, 'Interview outcome recorded.')
  } catch (error) {
    return handleError(error)
  }
})

export const cancelInterview = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireRecruitmentPermission(user, PERMISSIONS.RECRUITMENT_UPDATE)

    const { interviewId, reason } = (request.data ?? {}) as { interviewId?: string; reason?: string }
    const id = requireText(interviewId, 'interviewId', 200)

    const ref = db.collection(COLLECTIONS.INTERVIEWS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That interview no longer exists.')
    }
    const interview = snap.data()!
    if (interview.status === 'cancelled') {
      throw new AppError('failed-precondition', 'That interview is already cancelled.')
    }

    await ref.update({ status: 'cancelled', cancellationReason: reason?.trim() || null, ...updatedFields(user.uid) })

    // Cancel the calendar event alongside it, otherwise the interviewer's
    // diary keeps a slot for something that is not happening.
    if (interview.calendarEventId) {
      await db.collection(COLLECTIONS.CALENDAR_EVENTS).doc(interview.calendarEventId).update({
        eventStatus: 'cancelled',
        status: 'cancelled',
        cancellationReason: reason?.trim() || 'Interview cancelled.',
        ...updatedFields(user.uid),
      })
    }

    await sendNotificationInternal({
      type: 'alert',
      title: 'Interview cancelled',
      message: `The ${STAGE_LABELS[interview.stage as CandidateStage]} with ${interview.candidateName as string} was cancelled.`,
      module: 'hr',
      priority: 'medium',
      recipientUid: interview.interviewerUid,
      senderUid: user.uid,
      referenceModule: 'hr',
      referenceId: id,
    })

    await recordAuditEvent({
      eventType: 'InterviewCancelled',
      category: 'HR',
      module: 'hr',
      resourceType: 'interview',
      resourceId: id,
      action: 'cancel',
      user,
      previousValues: { scheduledAt: (interview.scheduledAt as Timestamp)?.toDate().toISOString() ?? null },
      newValues: { reason: reason?.trim() || null },
    })

    return successResponse({ interviewId: id }, 'Interview cancelled.')
  } catch (error) {
    return handleError(error)
  }
})
