import { onCall } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { sendNotificationInternal } from '../notifications'
import { submitApprovalInternal } from '../approval'
import { GOOGLE_CALENDAR_SA_KEY } from '../../lib/secrets'
import { busyIntervalsFromGoogle, deleteEventFromGoogle, pushEventToGoogle } from './googleSync'

/**
 * Executive calendar writes — HR_OPERATIONS.md §8.2 / §9.2. The read side is
 * plain Firestore (src/features/calendar/calendarService.ts + the
 * calendarEvents rules block); only these two callables mutate.
 *
 * startAt/endAt are stored as Firestore Timestamps, not the ISO strings the
 * client sends, so the agenda's `where('startAt','>=',…)` range filter and its
 * ordering are both served by the server. The read layer converts them back to
 * ISO strings (src/services/firestore/normalize.ts) to match CalendarEvent.
 *
 * Google Calendar sync (§9.3/§14.4) is provisioned: events are written
 * `syncStatus: 'pending'` and pushed inline by googleSync.ts, with
 * syncCalendarEvents sweeping anything that push missed every 15 minutes.
 * With no service-account secret or `integrations/googleCalendar` doc the push
 * is a no-op, so an unprovisioned environment behaves exactly as before.
 */

const EVENT_TYPES = [
  'executiveMeeting',
  'recruitmentInterview',
  'trainingSession',
  'performanceEvaluation',
  'probationReview',
  'openDoorProgram',
  'companyEvent',
  'recurringTask',
  'contractReview',
  'projectMilestone',
] as const
type CalendarEventType = (typeof EVENT_TYPES)[number]

const PRIORITIES = ['critical', 'high', 'medium', 'low', 'informational'] as const
type Priority = (typeof PRIORITIES)[number]

interface CreateCalendarEventInput {
  title: string
  description?: string
  eventType: CalendarEventType
  startAt: string
  endAt: string
  allDay?: boolean
  participants: string[]
  /** Free text — guests with no NourishOS account. Never notified, never a conflict/Google-sync input. */
  otherParticipants?: string
  location?: string
  priority: Priority
  recurrenceRule?: string
  overrideReason?: string
}

interface Conflict {
  eventId: string
  title: string
  startAt: string
  endAt: string
}

/** Rejects anything Date can't parse, so an unparseable string can't reach Firestore as an Invalid Date. */
function parseInstant(value: string, field: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('invalid-argument', `${field} must be a valid ISO 8601 instant.`)
  }
  return parsed
}

/**
 * Confirmed events that overlap [startAt, endAt) and share at least one
 * participant with the new event (HR_OPERATIONS.md §9.2-F07).
 *
 * Firestore allows only one range-filtered field per query, so the endAt side
 * is filtered in memory: we fetch confirmed events starting before the new
 * event ends, then keep the ones that haven't already finished. The startAt
 * bound keeps that fetch from growing with the whole history of the calendar.
 */
async function findConflicts(startAt: Date, endAt: Date, participants: string[]): Promise<Conflict[]> {
  if (participants.length === 0) return []

  const snap = await db
    .collection(COLLECTIONS.CALENDAR_EVENTS)
    .where('eventStatus', '==', 'confirmed')
    .where('startAt', '<', Timestamp.fromDate(endAt))
    .orderBy('startAt', 'desc')
    .limit(200)
    .get()

  const participantSet = new Set(participants)

  return snap.docs
    .filter((doc) => {
      const data = doc.data()
      const docEndAt = (data.endAt as Timestamp | undefined)?.toDate()
      if (!docEndAt || docEndAt <= startAt) return false
      return ((data.participants as string[] | undefined) ?? []).some((uid) => participantSet.has(uid))
    })
    .map((doc) => {
      const data = doc.data()
      return {
        eventId: doc.id,
        title: (data.title as string | undefined) ?? 'Untitled event',
        startAt: (data.startAt as Timestamp).toDate().toISOString(),
        endAt: (data.endAt as Timestamp).toDate().toISOString(),
      }
    })
}

/**
 * Pure — no auth/RBAC check, no audit. The caller (the callable below, or
 * another module's function such as scheduleInterview) owns both, the same
 * split as submitApprovalInternal / createTaskInternal. `source` stamps the
 * owning module and record so an event created by another feature can be
 * traced back to it.
 */
export async function createCalendarEventInternal(
  input: Partial<CreateCalendarEventInput>,
  user: AuthedUser,
  source?: { sourceModule: string; referenceId: string },
): Promise<{ eventId: string; startAt: Date; endAt: Date }> {
  if (
    !input.title ||
    !input.eventType ||
    !EVENT_TYPES.includes(input.eventType) ||
    !input.startAt ||
    !input.endAt ||
    !input.priority ||
    !PRIORITIES.includes(input.priority) ||
    !Array.isArray(input.participants) ||
    input.participants.length === 0
  ) {
    throw new AppError(
      'invalid-argument',
      'title, eventType, startAt, endAt, priority, and at least one participant are required.',
    )
  }

  const startAt = parseInstant(input.startAt, 'startAt')
  const endAt = parseInstant(input.endAt, 'endAt')
  if (endAt <= startAt) {
    throw new AppError('invalid-argument', 'endAt must be after startAt.')
  }

  // §9.2-F07: warn once, then let the caller retry with an overrideReason.
  // The client pulls `conflicts` off the error details (conflictsFromError).
  if (!input.overrideReason) {
    // §9.3-F03 widens the check to the shared Google calendar, so something
    // booked there but never entered here still surfaces. Google can only add
    // conflicts, never suppress the in-app ones.
    const [conflicts, googleBusy] = await Promise.all([
      findConflicts(startAt, endAt, input.participants),
      busyIntervalsFromGoogle(startAt, endAt),
    ])
    for (const busy of googleBusy) {
      conflicts.push({ eventId: 'google', title: 'Busy in Google Calendar', startAt: busy.start, endAt: busy.end })
    }
    if (conflicts.length > 0) {
      throw new AppError(
        'failed-precondition',
        `${conflicts.length} participant${conflicts.length === 1 ? ' has' : 's have'} an overlapping commitment.`,
        { conflicts },
      )
    }
  }

  // §9.2-F10: a companyEvent needs GM approval before it's confirmed — every
  // other event type is confirmed immediately, same as before this existed.
  const needsApproval = input.eventType === 'companyEvent'
  const eventStatus = needsApproval ? 'pendingApproval' : 'confirmed'

  const eventRef = db.collection(COLLECTIONS.CALENDAR_EVENTS).doc()
  await eventRef.set({
    title: input.title,
    description: input.description ?? null,
    eventType: input.eventType,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    allDay: input.allDay ?? false,
    participants: input.participants,
    otherParticipants: input.otherParticipants?.trim() || null,
    location: input.location ?? null,
    priority: input.priority,
    eventStatus,
    cancellationReason: null,
    approvalRequestId: null,
    recurrenceRule: input.recurrenceRule ?? null,
    outletId: user.outletId,
    departmentId: user.departmentId,
    sourceModule: source?.sourceModule ?? 'calendar',
    referenceId: source?.referenceId ?? null,
    gcalEventId: null,
    // 'pending' until the push below (or the 15-minute sweep) lands it. A
    // company event waiting on GM approval stays 'pending' deliberately —
    // syncCalendarEvents picks it up once approval flips it to confirmed.
    syncStatus: 'pending',
    syncError: null,
    lastSyncedAt: null,
    ...newDocumentBaseFields(user.uid, eventStatus),
  })

  if (needsApproval) {
    const approvalRequestId = await submitApprovalInternal({
      module: 'calendar',
      resourceType: 'companyEvent',
      resourceId: eventRef.id,
      requestedBy: user.uid,
      priority: input.priority === 'critical' ? 'critical' : 'medium',
    })
    await eventRef.update({ approvalRequestId })
  }

  await Promise.all(
    input.participants
      .filter((uid) => uid !== user.uid)
      .map((uid) =>
        sendNotificationInternal({
          type: 'alert',
          title: 'New Calendar Event',
          message: `${user.displayName} scheduled "${input.title}" for ${startAt.toISOString()}.`,
          module: 'calendar',
          priority: input.priority === 'critical' ? 'critical' : 'medium',
          recipientUid: uid,
          senderUid: user.uid,
          referenceModule: 'calendar',
          referenceId: eventRef.id,
        }),
      ),
  )

  // §9.3-F02: push confirmed events to Google within 30 seconds. Inline rather
  // than waiting for the sweep, and best-effort — pushEventToGoogle swallows
  // its own failures onto the doc, so scheduling never fails on Google's
  // account. A pendingApproval event is skipped inside the push itself.
  await pushEventToGoogle(eventRef.id)

  return { eventId: eventRef.id, startAt, endAt }
}

export const createCalendarEvent = onCall({ region: REGION, secrets: [GOOGLE_CALENDAR_SA_KEY] }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CALENDAR_CREATE)

    const input = (request.data ?? {}) as Partial<CreateCalendarEventInput>
    const { eventId, startAt, endAt } = await createCalendarEventInternal(input, user)

    await recordAuditEvent({
      eventType: 'CalendarEventCreated',
      category: 'Operations',
      module: 'calendar',
      resourceType: 'calendarEvent',
      resourceId: eventId,
      action: 'create',
      user,
      newValues: {
        title: input.title,
        eventType: input.eventType,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        participantCount: input.participants?.length ?? 0,
      },
      metadata: input.overrideReason ? { conflictOverrideReason: input.overrideReason } : undefined,
    })

    return successResponse({ eventId }, 'Event scheduled.')
  } catch (error) {
    handleError(error)
  }
})

export const cancelCalendarEvent = onCall({ region: REGION, secrets: [GOOGLE_CALENDAR_SA_KEY] }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { eventId, cancellationReason } = (request.data ?? {}) as {
      eventId?: string
      cancellationReason?: string
    }

    if (!eventId) {
      throw new AppError('invalid-argument', 'eventId is required.')
    }

    const eventRef = db.collection(COLLECTIONS.CALENDAR_EVENTS).doc(eventId)
    const snap = await eventRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Event not found.')
    }
    const event = snap.data()!

    // §7.2: the organiser can always cancel their own event; cancelling
    // anyone else's needs calendar.manage.
    if (event.createdBy !== user.uid) {
      requirePermission(user, PERMISSIONS.CALENDAR_MANAGE)
    }

    if (event.eventStatus === 'cancelled') {
      throw new AppError('failed-precondition', 'This event is already cancelled.')
    }

    await eventRef.update({
      eventStatus: 'cancelled',
      cancellationReason: cancellationReason ?? null,
      status: 'cancelled',
      ...updatedFields(user.uid),
    })

    // §9.3-F06 — drop the Google copy too, or it keeps ringing people's phones.
    await deleteEventFromGoogle(eventId)

    await recordAuditEvent({
      eventType: 'CalendarEventCancelled',
      category: 'Operations',
      module: 'calendar',
      resourceType: 'calendarEvent',
      resourceId: eventId,
      action: 'update',
      user,
      previousValues: { eventStatus: event.eventStatus },
      newValues: { eventStatus: 'cancelled', cancellationReason: cancellationReason ?? null },
    })

    await Promise.all(
      ((event.participants as string[] | undefined) ?? [])
        .filter((uid) => uid !== user.uid)
        .map((uid) =>
          sendNotificationInternal({
            type: 'alert',
            title: 'Calendar Event Cancelled',
            message: `${user.displayName} cancelled "${event.title as string}".`,
            module: 'calendar',
            priority: 'medium',
            recipientUid: uid,
            senderUid: user.uid,
            referenceModule: 'calendar',
            referenceId: eventId,
          }),
        ),
    )

    return successResponse({ eventId }, 'Event cancelled.')
  } catch (error) {
    handleError(error)
  }
})
