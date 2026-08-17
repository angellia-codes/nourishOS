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
  dueDate?: string
  estimatedDurationMinutes?: number
  tags?: string[]

  // Written by completeTask / cancelTask (functions/src/shared/tasks/tasks.ts)
  // and read by the task detail page.
  completedBy?: string | null
  completedAt?: string | null
  completionComment?: string | null
  cancellationReason?: string | null

  // Daily Updates task aging (daily-updates.md §5) — kept optional/generic
  // per that doc's own framing, so any long-lived task type can use them
  // later rather than hardcoding to Daily Updates only.
  daysOpen?: number
  escalationLevel?: 0 | 1 | 2 | 3 | 4
  carryForwardFromTaskId?: string
}

/**
 * TASK_ENGINE.md §5 "Comments". `taskParticipants` is the task's assignees plus
 * its creator, frozen at write time — firestore.rules reads it so a plain
 * `where taskId == …` query needs no get() on the parent task.
 */
export interface TaskComment extends BaseDocument {
  taskId: string
  body: string
  taskParticipants: string[]
  /** @-mentioned uids picked from the directory autocomplete — communications.md §11. */
  mentionedUids: string[]
}
