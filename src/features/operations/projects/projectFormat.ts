import {
  Archive,
  Ban,
  CheckCheck,
  ClipboardList,
  Eye,
  FileEdit,
  Hourglass,
  PlayCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { Priority } from '@/constants/statuses'
import type { Project, ProjectColumn, ProjectStatus } from '@/types'

/** HR_OPERATIONS.md §9.8 — the five board columns, in order. */
export const PROJECT_COLUMNS: ProjectColumn[] = ['backlog', 'todo', 'inProgress', 'review', 'completed']

export const COLUMN_LABELS: Record<ProjectColumn, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  inProgress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
}

/** §9.8's "SLA to Progress" column, shown as the sub-label on each board column. */
export const COLUMN_SLA: Record<ProjectColumn, string> = {
  backlog: 'No SLA',
  todo: 'Within the sprint',
  inProgress: 'Per task due date',
  review: '1–2 days',
  completed: 'Final',
}

export const COLUMN_ICON: Record<ProjectColumn, LucideIcon> = {
  backlog: Archive,
  todo: ClipboardList,
  inProgress: PlayCircle,
  review: Eye,
  completed: CheckCheck,
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  active: 'Active',
  completed: 'Completed',
  rejected: 'Not Approved',
  cancelled: 'Cancelled',
}

export const PROJECT_STATUS_ICON: Record<ProjectStatus, LucideIcon> = {
  draft: FileEdit,
  pending_approval: Hourglass,
  active: PlayCircle,
  completed: CheckCheck,
  rejected: XCircle,
  cancelled: Ban,
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  draft: 'neutral',
  pending_approval: 'warning',
  active: 'info',
  completed: 'success',
  rejected: 'error',
  cancelled: 'closed',
}

export const PROJECT_PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const PROJECT_PRIORITY_VARIANT: Record<Priority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}

/** Milestone completion, the closest thing §9.9's "completion bars" has to a source. */
export function milestoneProgress(project: Project): { done: number; total: number; percent: number } {
  const total = project.milestones?.length ?? 0
  const done = project.milestones?.filter((m) => m.completed).length ?? 0
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/**
 * §9.9's "Projects At Risk" widget definition is "projects with overdue tasks";
 * with no task join on the board itself, the project-level equivalent is a
 * target date that has passed while the project is still open.
 */
export function isAtRisk(project: Project, today = new Date().toISOString().slice(0, 10)): boolean {
  return project.status === 'active' && project.column !== 'completed' && project.targetDate < today
}
