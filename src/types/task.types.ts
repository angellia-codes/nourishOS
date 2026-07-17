import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { TaskStatus, TaskType, Priority } from '@/constants/statuses'

/** Source: TASK_ENGINE.md §5. Every module creates tasks through this shape — no module-specific task types. */
export interface Task extends BaseDocument {
  title: string
  description?: string
  taskType: TaskType
  sourceModule: string
  referenceId?: string
  /** Always an array in Firestore, even for a single assignee — required for array-contains queries. */
  assignedTo: string[]
  assignedBy: string
  priority: Priority
  taskStatus: TaskStatus
  dueDate?: Timestamp
  estimatedDurationMinutes?: number
  tags?: string[]

  // Daily Updates task aging (daily-updates.md §5) — kept optional/generic
  // per that doc's own framing, so any long-lived task type can use them
  // later rather than hardcoding to Daily Updates only.
  daysOpen?: number
  escalationLevel?: 0 | 1 | 2 | 3 | 4
  carryForwardFromTaskId?: string
}
