import { callFunction } from '@/services/api'
import { subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { CalendarConflict, CalendarEvent, CalendarEventType, UserProfile } from '@/types'
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
    [where('startAt', '>=', startOfToday.toISOString()), orderBy('startAt', 'asc')],
    onChange,
  )
}

export interface ParticipantOption {
  uid: string
  displayName: string
}

/** Participant picker source. Readable by exactly the roles that can create events (firestore.rules). */
export function subscribeToParticipantOptions(onChange: (options: ParticipantOption[]) => void): Unsubscribe {
  return subscribeToCollection<UserProfile & { id: string }>(
    COLLECTIONS.USERS,
    [where('status', '==', 'active')],
    (users) =>
      onChange(
        users
          // The doc id IS the uid (users/{uid}); falling back to it keeps the
          // picker working for older docs written without the field.
          .map((user) => ({ uid: user.uid ?? user.id, displayName: user.displayName || user.email }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      ),
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
