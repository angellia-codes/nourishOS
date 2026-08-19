import {
  FileEdit,
  UserCheck,
  PlayCircle,
  PauseCircle,
  Check,
  BadgeCheck,
  Lock,
  XCircle,
  AlarmClock,
  Archive,
  type LucideIcon,
} from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { TaskStatus, TaskType, Priority } from '@/constants/statuses'

/** TASK_ENGINE.md §8. The engine only ever writes assigned/completed/cancelled today; the rest are mapped so an older or future row still renders. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  accepted: 'Accepted',
  inProgress: 'In Progress',
  waiting: 'Waiting',
  completed: 'Completed',
  verified: 'Verified',
  closed: 'Closed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
  archived: 'Archived',
}

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  draft: 'draft',
  assigned: 'info',
  accepted: 'info',
  inProgress: 'warning',
  waiting: 'warning',
  completed: 'success',
  verified: 'success',
  closed: 'closed',
  cancelled: 'neutral',
  overdue: 'error',
  archived: 'closed',
}

export const TASK_STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  draft: FileEdit,
  assigned: UserCheck,
  accepted: UserCheck,
  inProgress: PlayCircle,
  waiting: PauseCircle,
  completed: Check,
  verified: BadgeCheck,
  closed: Lock,
  cancelled: XCircle,
  overdue: AlarmClock,
  archived: Archive,
}

/** TASK_ENGINE.md §4. */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  approval: 'Approval',
  checklist: 'Checklist',
  reminder: 'Reminder',
  followUp: 'Follow-up',
  training: 'Training',
  inspection: 'Inspection',
  maintenance: 'Maintenance',
  documentReview: 'Document Review',
  recruitment: 'Recruitment',
  performanceReview: 'Performance Review',
  assetAssignment: 'Asset Assignment',
  custom: 'Custom',
}

export const TASK_PRIORITY_VARIANT: Record<Priority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

/** Terminal states — TASK_ENGINE.md §6. Nothing can be done to a task in one of these. */
export const TERMINAL_TASK_STATUSES: TaskStatus[] = ['completed', 'verified', 'closed', 'cancelled', 'archived']

export function isTerminal(taskStatus: TaskStatus): boolean {
  return TERMINAL_TASK_STATUSES.includes(taskStatus)
}
