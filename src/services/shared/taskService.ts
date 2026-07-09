import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { queryDocuments, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Task } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

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

export function subscribeToMyTasks(uid: string, onChange: (tasks: Task[]) => void): Unsubscribe {
  return subscribeToCollection<Task>(
    COLLECTIONS.TASKS,
    [where('assignedTo', 'array-contains', uid), orderBy('dueDate', 'asc')],
    onChange,
  )
}
