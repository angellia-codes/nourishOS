export type WorkOrderStatus = 'open' | 'assigned' | 'inProgress' | 'completed' | 'closed'
export type WorkOrderPriority = 'critical' | 'high' | 'medium' | 'low'

/** Forward-only lifecycle — FEATURE_SPECIFICATIONS.md Module 5: Request → Assign → In Progress → Completed → Closed. */
export const WORK_ORDER_NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  open: 'assigned',
  assigned: 'inProgress',
  inProgress: 'completed',
  completed: 'closed',
}

/** Statuses the escalation sweep still counts as outstanding work. */
export const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['open', 'assigned', 'inProgress']

/**
 * Photos are ordinary `files` documents; the resourceType is what separates
 * the condition-on-arrival shot from the proof-of-completion one, so no new
 * collection or schema field is needed and both stay queryable by equality
 * alone (no composite index).
 */
export const WORK_ORDER_PHOTO_BEFORE = 'workOrder'
export const WORK_ORDER_PHOTO_AFTER = 'workOrderAfter'

/**
 * Escalation ladder for a work order that is still open, measured from
 * createdAt. Engineering owns the queue, so it hears first; the GM is the
 * backstop two days later. Same shape as the Daily Updates ladder
 * (dailyUpdates/helpers.ts), including the level counter that makes the
 * sweep idempotent.
 */
export const WORK_ORDER_ESCALATIONS: { daysOpen: number; level: 1 | 2; role: string }[] = [
  { daysOpen: 1, level: 1, role: 'engineering' },
  { daysOpen: 3, level: 2, role: 'generalManager' },
]
