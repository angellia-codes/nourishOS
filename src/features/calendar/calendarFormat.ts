import type { Priority } from '@/constants/statuses'
import type { CalendarEventType, CalendarSyncStatus } from '@/types'

/** HR_OPERATIONS.md §9.2 — event types with the colors the spec assigns them. */
export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  executiveMeeting: 'Executive Meeting',
  recruitmentInterview: 'Recruitment Interview',
  trainingSession: 'Training Session',
  performanceEvaluation: 'Performance Evaluation',
  probationReview: 'Probation Review',
  openDoorProgram: 'Open Door Program',
  companyEvent: 'Company Event',
  recurringTask: 'Recurring Task',
  contractReview: 'Contract Review',
  projectMilestone: 'Project Milestone',
}

/** The §9.2 hex colors verbatim — used for the agenda's type dot, not for text (contrast varies). */
export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  executiveMeeting: '#1F3864',
  recruitmentInterview: '#008080',
  trainingSession: '#375623',
  performanceEvaluation: '#7030A0',
  probationReview: '#C55A11',
  openDoorProgram: '#FFD700',
  companyEvent: '#C00000',
  recurringTask: '#808080',
  contractReview: '#843C0C',
  projectMilestone: '#FF007F',
}

export const EVENT_PRIORITY_VARIANT: Record<Priority, 'neutral' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}

/** Only surfaced when something needs attention — a healthy 'synced' event says nothing. */
export const SYNC_STATUS_LABELS: Record<CalendarSyncStatus, string> = {
  pending: 'Sync pending',
  synced: 'Synced to Google',
  failed: 'Google sync failed',
  skipped: 'Google Calendar not connected',
}

/** "Thu, 16 Jul 2026" — the agenda's day heading. */
export function formatEventDay(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** "18:45" — 24h, matching the rest of the app's en-GB formatting. */
export function formatEventTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** "16 Jul 2026, 18:45" — used for conflict rows, which carry raw ISO strings. */
export function formatIsoDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Combines the form's date + time inputs into an ISO instant in the browser's timezone. */
export function toIsoInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}
