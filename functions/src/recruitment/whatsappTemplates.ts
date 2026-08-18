import { logger } from 'firebase-functions/v2'
import { BUSINESS_TIME_ZONE } from '../lib'
import { hrContactDetails, sendWhatsApp } from '../shared/notifications'
import type { CandidateStage } from './helpers'

/**
 * HR_OPERATIONS.md §9.5 — the six candidate WhatsApp templates, dispatched
 * through the Fonnte adapter (§9.11's channel), not a second messaging system.
 *
 * A candidate is external: no uid, no `users` doc, so no in-app notification
 * exists to hang these off. They go straight through `sendWhatsApp` with the
 * candidate's own `phone`, unlike staff-facing alerts which opt in via
 * `sendNotificationInternal({ whatsapp: true })`.
 *
 * Every send is best-effort and swallowed: a disconnected Fonnte device must
 * never roll back a stage move that already committed.
 */

/** §9.5's [DATE] — "DD MMMM YYYY", rendered in WITA so it matches the invite. */
function formatDate(instant: Date): string {
  return instant.toLocaleDateString('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** §9.5's [TIME]. */
function formatTime(instant: Date): string {
  return instant.toLocaleTimeString('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function signature(hr: { name: string; phone: string }): string {
  return hr.phone ? `\n\n${hr.name}\nNourish Group Indonesia\n${hr.phone}` : `\n\n${hr.name}\nNourish Group Indonesia`
}

/** Fire-and-log: the caller's mutation has already committed by this point. */
async function dispatch(target: string | undefined, message: string, label: string): Promise<void> {
  if (!target) return
  try {
    const result = await sendWhatsApp(target, message)
    if (result.status === 'failed') logger.warn(`WhatsApp ${label} not delivered: ${result.error}`)
  } catch (error) {
    logger.error(`WhatsApp ${label} threw`, error)
  }
}

/**
 * Templates 1, 4, 5 and 6 — the stage-triggered messages. ST-08 (Withdrawn)
 * deliberately sends nothing, per §9.5's own table.
 */
export async function notifyCandidateOfStage(
  candidate: FirebaseFirestore.DocumentData,
  stage: CandidateStage,
): Promise<void> {
  const hr = await hrContactDetails()
  const name = candidate.fullName as string
  const position = candidate.positionApplied as string

  let message: string | null = null

  switch (stage) {
    case 'ST-02': // 1. Initial Contact
      message =
        `Halo ${name}, thank you for applying for the ${position} role at Nourish Group Indonesia. ` +
        `Your application is now being screened and we will be in touch about the next step.${signature(hr)}`
      break
    case 'ST-05': // 4. Offer Notification
      message =
        `Congratulations ${name}! We would like to offer you the ${position} position at Nourish Group Indonesia. ` +
        `Our HR team will contact you shortly with the offer details.${signature(hr)}`
      break
    case 'ST-06': // 6. Join Date Confirmation
      message =
        `Welcome to the team, ${name}! Your start date as ${position} is confirmed for ` +
        `${candidate.joinDate as string}. HR will share your onboarding details before then.${signature(hr)}`
      break
    case 'ST-07': // 5. Rejection Message
      message =
        `Dear ${name}, thank you for your interest in the ${position} role at Nourish Group Indonesia. ` +
        `After careful consideration we are moving forward with other candidates. ` +
        `We wish you every success and hope to stay in touch.${signature(hr)}`
      break
    default:
      message = null
  }

  if (message) await dispatch(candidate.phone as string | undefined, message, `stage ${stage}`)
}

/**
 * Template 2 — Interview Invitation, to the candidate and the interviewer.
 * §9.5 addresses both; the interviewer also gets the in-app task the
 * scheduling callable already creates.
 */
export async function notifyInterviewScheduled(input: {
  candidate: FirebaseFirestore.DocumentData
  stageLabel: string
  scheduledAt: Date
  location: string
  interviewerName: string
  interviewerPhone?: string | null
}): Promise<void> {
  const hr = await hrContactDetails()
  const date = formatDate(input.scheduledAt)
  const time = formatTime(input.scheduledAt)

  await dispatch(
    input.candidate.phone as string | undefined,
    `Halo ${input.candidate.fullName as string}, your ${input.stageLabel} for the ` +
      `${input.candidate.positionApplied as string} role is scheduled for ${date} at ${time} WITA, ` +
      `${input.location}. You will be meeting ${input.interviewerName}. ` +
      `Please reply to confirm your attendance.${signature(hr)}`,
    'interview invitation (candidate)',
  )

  await dispatch(
    input.interviewerPhone ?? undefined,
    `Interview scheduled: ${input.candidate.fullName as string} (${input.candidate.positionApplied as string}) — ` +
      `${input.stageLabel} on ${date} at ${time} WITA, ${input.location}.`,
    'interview invitation (interviewer)',
  )
}

/** Template 3 — Interview Reminder, 24 hours out. Called by the scheduled job. */
export async function notifyInterviewReminder(input: {
  candidate: FirebaseFirestore.DocumentData
  stageLabel: string
  scheduledAt: Date
  location: string
  interviewerPhone?: string | null
}): Promise<void> {
  const hr = await hrContactDetails()
  const date = formatDate(input.scheduledAt)
  const time = formatTime(input.scheduledAt)

  await dispatch(
    input.candidate.phone as string | undefined,
    `Reminder: your ${input.stageLabel} at Nourish Group Indonesia is tomorrow, ${date} at ${time} WITA, ` +
      `${input.location}. See you there!${signature(hr)}`,
    'interview reminder (candidate)',
  )

  await dispatch(
    input.interviewerPhone ?? undefined,
    `Reminder: you are interviewing ${input.candidate.fullName as string} tomorrow, ${date} at ${time} WITA, ` +
      `${input.location}.`,
    'interview reminder (interviewer)',
  )
}
