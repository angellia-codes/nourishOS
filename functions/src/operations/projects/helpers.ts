import { AppError } from '../../lib'

/**
 * HR_OPERATIONS.md §9.8 Kanban columns. `backlog` is where a project sits
 * before its request is approved — the approval-resolved handler is what moves
 * it to `todo`, the same "approval owns the first transition" rule the
 * requisition module enforces with `vacancyStage`.
 */
export const PROJECT_COLUMNS = ['backlog', 'todo', 'inProgress', 'review', 'completed'] as const
export type ProjectColumn = (typeof PROJECT_COLUMNS)[number]

export const COLUMN_LABELS: Record<ProjectColumn, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  inProgress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
}

export const PROJECT_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number]

/** Tag on the Task Engine docs belonging to a project — the same tags-over-new-TASK_TYPE convention Daily Updates uses. */
export const PROJECT_TASK_TAG = 'project'

export interface ProjectMilestone {
  title: string
  dueDate: string
  completed: boolean
}

export function requireText(value: unknown, label: string, max: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new AppError('invalid-argument', `${label} is required.`)
  if (text.length > max) throw new AppError('invalid-argument', `${label} must be ${max} characters or fewer.`)
  return text
}

export function requireIsoDate(value: unknown, label: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError('invalid-argument', `${label} must be a date in YYYY-MM-DD format.`)
  }
  return text
}

/**
 * Milestones are an embedded array, not their own collection: §9.8 asks for
 * milestone tracking, and a milestone has no lifecycle of its own beyond the
 * project's. Capped so the doc can't grow past what a single read should carry.
 */
export function parseMilestones(value: unknown): ProjectMilestone[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new AppError('invalid-argument', 'Milestones must be a list.')
  if (value.length > 25) throw new AppError('invalid-argument', 'A project can carry at most 25 milestones.')

  return value.map((raw, index) => {
    const milestone = (raw ?? {}) as Record<string, unknown>
    return {
      title: requireText(milestone.title, `Milestone ${index + 1} title`, 160),
      dueDate: requireIsoDate(milestone.dueDate, `Milestone ${index + 1} due date`),
      completed: milestone.completed === true,
    }
  })
}
