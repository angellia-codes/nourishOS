import type { BaseDocument } from './firestore.types'
import type { Priority } from '@/constants/statuses'

/** HR_OPERATIONS.md §9.2 — the ten executive calendar event types. */
export type CalendarEventType =
  | 'executiveMeeting'
  | 'recruitmentInterview'
  | 'trainingSession'
  | 'performanceEvaluation'
  | 'probationReview'
  | 'openDoorProgram'
  | 'companyEvent'
  | 'recurringTask'
  | 'contractReview'
  | 'projectMilestone'

export type CalendarEventStatus = 'confirmed' | 'cancelled'

/** Push-sync state against Google Calendar — 'skipped' means the integration isn't provisioned yet. */
export type CalendarSyncStatus = 'pending' | 'synced' | 'failed' | 'skipped'

/**
 * Executive calendar event — HR_OPERATIONS.md §8.2 / §9.2. The field-level
 * schema is absent from the PRD's §12 data-schema section; this shape is what
 * functions/src/shared/calendar/events.ts actually writes, and §12.6 of the
 * doc was added to match it.
 *
 * Times are ISO 8601 strings, not civil-date strings like Employee's
 * joinDate: an event happens at an instant and is pushed to Google Calendar
 * with a timezone, so the time of day is load-bearing.
 */
export interface CalendarEvent extends BaseDocument {
  title: string
  description?: string | null
  eventType: CalendarEventType

  startAt: string
  endAt: string
  allDay: boolean

  /** User uids. Drives notifications and conflict detection. */
  participants: string[]
  location?: string | null
  priority: Priority

  eventStatus: CalendarEventStatus
  cancellationReason?: string | null

  /** RRULE body without the 'RRULE:' prefix — handed to Google as-is, not expanded server-side. */
  recurrenceRule?: string | null

  departmentId?: string
  outletId?: string

  /** Set when another module owns the event (e.g. 'recruitment' + a candidateId). */
  sourceModule: string
  referenceId?: string | null

  /** Google Calendar event id — the dedup key from HR_OPERATIONS.md §14.4. */
  gcalEventId?: string | null
  syncStatus: CalendarSyncStatus
  syncError?: string | null
  lastSyncedAt?: string | null
}

/** One overlapping commitment returned by the conflict check (HR_OPERATIONS.md §9.2-F07). */
export interface CalendarConflict {
  /** 'google' for a busy block that exists only on the shared Google Calendar. */
  eventId: string
  title: string
  startAt: string
  endAt: string
}
