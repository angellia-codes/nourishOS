import { callFunction } from '@/services/api'
import { queryDocuments, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Task, TaskComment } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface CreateTaskInput {
  title: string
  description?: string
  taskType: Task['taskType']
  sourceModule: string
  referenceId?: string
  assignedTo: string | string[]
  priority: Task['priority']
  dueDate?: string // ISO — converted to Timestamp server-side
}

export function createTask(input: CreateTaskInput): Promise<{ taskId: string }> {
  return callFunction('createTask', input)
}

export function assignTask(input: { taskId: string; assignedTo: string | string[] }): Promise<void> {
  return callFunction('assignTask', input)
}

export function completeTask(input: { taskId: string; comment?: string }): Promise<void> {
  return callFunction('completeTask', input)
}

export function cancelTask(input: { taskId: string; reason?: string }): Promise<void> {
  return callFunction('cancelTask', input)
}

/** One-shot — for a dashboard widget that doesn't need live updates. */
export function getMyTasks(uid: string): Promise<Task[]> {
  return queryDocuments<Task>(COLLECTIONS.TASKS, [
    where('assignedTo', 'array-contains', uid),
    orderBy('dueDate', 'asc'),
  ])
}

export function subscribeToMyTasks(
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('assignedTo', 'array-contains', uid), orderBy('dueDate', 'asc')],
    onChange,
    onError,
  )
}

/**
 * dashboard.md §15 "Recently Completed Tasks" widget. No orderBy here on
 * purpose — assignedTo+taskStatus is the composite index this needs;
 * adding completedAt as a third field would need a second one for five rows
 * of a dashboard widget, so this sorts/slices client-side instead.
 */
export function subscribeToMyCompletedTasks(
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('assignedTo', 'array-contains', uid), where('taskStatus', '==', 'completed')],
    onChange,
    onError,
  )
}

/**
 * HR_OPERATIONS.md §9.9's "Escalated Issues (5+ days)" GM widget — every open
 * daily-update task, filtered to the escalated ones client-side. A single
 * `array-contains` needs no composite index, and the escalationLevel filter
 * can't be pushed down alongside it without one; the tag set is small enough
 * that filtering five rows out of it in memory is cheaper than a new index.
 *
 * Only elevated roles can read tasks they aren't party to, so the caller must
 * treat a permission error as "not for this role" rather than an outage.
 */
export function subscribeToDailyUpdateTasks(
  onChange: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('tags', 'array-contains', 'dailyUpdate')],
    onChange,
    onError,
  )
}

/** The other half of the task list — what this user handed out. Matches the `assignedBy == uid` branch of the tasks read rule. */
export function subscribeToTasksAssignedByMe(
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('assignedBy', '==', uid), orderBy('dueDate', 'asc')],
    onChange,
    onError,
  )
}

export function addTaskComment(input: {
  taskId: string
  body: string
  mentionedUids?: string[]
}): Promise<{ commentId: string }> {
  return callFunction('addTaskComment', input)
}

export function subscribeToTaskComments(
  taskId: string,
  onChange: (comments: TaskComment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<TaskComment>(
    COLLECTIONS.TASK_COMMENTS,
    [where('taskId', '==', taskId), orderBy('createdAt', 'asc')],
    onChange,
    onError,
  )
}
