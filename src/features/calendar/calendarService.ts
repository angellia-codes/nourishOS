import { callFunction } from '@/services/api'
import { subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { CalendarConflict, CalendarEvent, CalendarEventType } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface CreateCalendarEventInput {
  title: string
  description?: string
  eventType: CalendarEventType
  /** ISO instants — build them with calendarFormat's toIsoInstant(). */
  startAt: string
  endAt: string
  allDay?: boolean
  participants: string[]
  /** Free text — guests with no NourishOS account. Never notified, no conflict/Google-sync effect. */
  otherParticipants?: string
  location?: string
  priority: Priority
  recurrenceRule?: string
  /** Set only on the retry after a conflict warning — E02-US02. */
  overrideReason?: string
}

export function createCalendarEvent(input: CreateCalendarEventInput): Promise<{ eventId: string }> {
  return callFunction('createCalendarEvent', input)
}

export function cancelCalendarEvent(eventId: string, cancellationReason?: string): Promise<{ eventId: string }> {
  return callFunction('cancelCalendarEvent', { eventId, cancellationReason })
}

/**
 * Confirmed and cancelled events from the start of today onward. Past events
 * are deliberately excluded — this is an agenda, and the month view that
 * would need history is deferred (HR_OPERATIONS.md §9.2-F01).
 */
export function subscribeToUpcomingEvents(onChange: (events: CalendarEvent[]) => void): Unsubscribe {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  return subscribeToCollection<CalendarEvent>(
    COLLECTIONS.CALENDAR_EVENTS,
    // A Date here, not an ISO string — startAt is stored as a Firestore
    // Timestamp (createCalendarEvent writes it that way) and the read layer
    // normalises it back to an ISO string for CalendarEvent.
    [where('startAt', '>=', startOfToday), orderBy('startAt', 'asc')],
    onChange,
  )
}

/**
 * Confirmed and cancelled events starting within [start, end) — the month
 * view's query (HR_OPERATIONS.md §9.2-F01). Same single-range-field shape as
 * subscribeToUpcomingEvents, so no new composite index is needed.
 */
export function subscribeToEventsInRange(
  start: Date,
  end: Date,
  onChange: (events: CalendarEvent[]) => void,
): Unsubscribe {
  return subscribeToCollection<CalendarEvent>(
    COLLECTIONS.CALENDAR_EVENTS,
    [where('startAt', '>=', start), where('startAt', '<', end), orderBy('startAt', 'asc')],
    onChange,
  )
}

/**
 * Pulls the conflict list out of a rejected createCalendarEvent call. The
 * backend throws failed-precondition with `{ conflicts }` in details; anything
 * else is a real error and stays the caller's problem.
 */
export function conflictsFromError(error: unknown): CalendarConflict[] | null {
  const details = (error as { details?: { conflicts?: CalendarConflict[] } })?.details
  return details?.conflicts ?? null
}
