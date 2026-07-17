export const OPEN_TASK_STATUSES = ['draft', 'assigned', 'accepted', 'inProgress', 'waiting', 'overdue'] as const
export const CLOSED_TASK_STATUSES = ['completed', 'verified', 'closed', 'cancelled', 'archived'] as const

export const DAILY_UPDATE_TAG = 'dailyUpdate'

/** daily-updates.md §5. Escalation fires once per level per task, gated by escalationLevel so a re-run of the scheduled function never re-notifies. */
export const ESCALATION_THRESHOLDS: { daysOpen: number; level: 1 | 2 | 3 | 4; role: string }[] = [
  { daysOpen: 2, level: 1, role: 'outletManager' },
  { daysOpen: 3, level: 2, role: 'hrManager' },
  { daysOpen: 5, level: 3, role: 'generalManager' },
  { daysOpen: 14, level: 4, role: 'generalManager' },
]

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
