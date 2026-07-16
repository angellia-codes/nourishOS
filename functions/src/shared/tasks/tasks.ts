import { onCall } from 'firebase-functions/v2/https'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { sendNotificationInternal } from '../notifications'

/** Mirrors TASK_TYPE / PRIORITY in src/constants/statuses.ts (TASK_ENGINE.md §4, §7) — known duplication, keep in sync. */
const TASK_TYPES = [
  'approval',
  'checklist',
  'reminder',
  'followUp',
  'training',
  'inspection',
  'maintenance',
  'documentReview',
  'recruitment',
  'performanceReview',
  'assetAssignment',
  'custom',
] as const
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

/** Statuses a task can no longer be acted on from — TASK_ENGINE.md §6 terminal states. */
const TERMINAL_TASK_STATUSES = ['completed', 'verified', 'closed', 'cancelled', 'archived']

export interface CreateTaskInternalInput {
  title: string
  description?: string
  taskType: (typeof TASK_TYPES)[number]
  sourceModule: string
  referenceId?: string
  /** Normalized to an array in Firestore — required for array-contains queries (src/types/task.types.ts). */
  assignedTo: string | string[]
  assignedBy: string
  priority: (typeof PRIORITIES)[number]
  dueDate?: string // ISO YYYY-MM-DD or full ISO datetime — converted to Timestamp here
}

/**
 * Internal — other Cloud Functions (approval SLAs, contract alerts, …)
 * create tasks through this, same as sendNotificationInternal. The caller
 * owns auth/validation of its own request; this validates the task shape.
 */
export async function createTaskInternal(input: CreateTaskInternalInput): Promise<string> {
  const assignedTo = (Array.isArray(input.assignedTo) ? input.assignedTo : [input.assignedTo]).filter(Boolean)
  if (assignedTo.length === 0) {
    throw new AppError('invalid-argument', 'assignedTo must contain at least one user.')
  }

  let dueDate: Timestamp | null = null
  if (input.dueDate) {
    const parsed = Date.parse(input.dueDate)
    if (Number.isNaN(parsed)) {
      throw new AppError('invalid-argument', 'dueDate must be a valid ISO date string.')
    }
    dueDate = Timestamp.fromMillis(parsed)
  }

  const taskRef = db.collection(COLLECTIONS.TASKS).doc()
  await taskRef.set({
    title: input.title,
    description: input.description ?? null,
    taskType: input.taskType,
    sourceModule: input.sourceModule,
    referenceId: input.referenceId ?? null,
    assignedTo,
    assignedBy: input.assignedBy,
    priority: input.priority,
    taskStatus: 'assigned',
    dueDate,
    ...newDocumentBaseFields(input.assignedBy),
  })

  await Promise.all(
    assignedTo.map((recipientUid) =>
      sendNotificationInternal({
        type: 'task',
        title: 'New Task Assigned',
        message: input.title,
        module: input.sourceModule,
        priority: input.priority,
        recipientUid,
        senderUid: input.assignedBy,
        referenceModule: input.sourceModule,
        referenceId: taskRef.id,
      }),
    ),
  )

  return taskRef.id
}

export const createTask = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const input = (request.data ?? {}) as Partial<CreateTaskInternalInput>

    if (!input.title?.trim() || !input.sourceModule?.trim()) {
      throw new AppError('invalid-argument', 'title and sourceModule are required.')
    }
    if (!TASK_TYPES.includes(input.taskType as (typeof TASK_TYPES)[number])) {
      throw new AppError('invalid-argument', `taskType must be one of: ${TASK_TYPES.join(', ')}.`)
    }
    if (!PRIORITIES.includes(input.priority as (typeof PRIORITIES)[number])) {
      throw new AppError('invalid-argument', `priority must be one of: ${PRIORITIES.join(', ')}.`)
    }
    if (!input.assignedTo || (Array.isArray(input.assignedTo) && input.assignedTo.length === 0)) {
      throw new AppError('invalid-argument', 'assignedTo is required.')
    }

    const taskId = await createTaskInternal({
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      taskType: input.taskType as (typeof TASK_TYPES)[number],
      sourceModule: input.sourceModule.trim(),
      referenceId: input.referenceId,
      assignedTo: input.assignedTo,
      assignedBy: user.uid,
      priority: input.priority as (typeof PRIORITIES)[number],
      dueDate: input.dueDate,
    })

    await recordAuditEvent({
      eventType: 'TaskCreated',
      category: 'Tasks',
      module: input.sourceModule.trim(),
      resourceType: 'task',
      resourceId: taskId,
      action: 'create',
      user,
      newValues: { title: input.title.trim(), taskType: input.taskType, priority: input.priority },
    })

    return successResponse({ taskId }, 'Task created.')
  } catch (error) {
    handleError(error)
  }
})

export const assignTask = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { taskId, assignedTo } = (request.data ?? {}) as {
      taskId?: string
      assignedTo?: string | string[]
    }

    if (!taskId || !assignedTo || (Array.isArray(assignedTo) && assignedTo.length === 0)) {
      throw new AppError('invalid-argument', 'taskId and assignedTo are required.')
    }
    const newAssignees = (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).filter(Boolean)

    const taskRef = db.collection(COLLECTIONS.TASKS).doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new AppError('not-found', 'Task not found.')
    }
    const task = taskSnap.data()!

    if (TERMINAL_TASK_STATUSES.includes(task.taskStatus)) {
      throw new AppError('failed-precondition', `This task is already ${task.taskStatus}.`)
    }
    const isCreator = task.assignedBy === user.uid
    const isAssignee = (task.assignedTo as string[]).includes(user.uid)
    if (!isCreator && !isAssignee) {
      throw new AppError('permission-denied', 'Only the task creator or a current assignee can reassign it.')
    }

    await taskRef.update({
      assignedTo: newAssignees,
      taskStatus: 'assigned',
      ...updatedFields(user.uid),
    })

    await Promise.all(
      newAssignees.map((recipientUid) =>
        sendNotificationInternal({
          type: 'task',
          title: 'Task Assigned to You',
          message: task.title,
          module: task.sourceModule,
          priority: task.priority,
          recipientUid,
          senderUid: user.uid,
          referenceModule: task.sourceModule,
          referenceId: taskId,
        }),
      ),
    )

    await recordAuditEvent({
      eventType: 'TaskAssigned',
      category: 'Tasks',
      module: task.sourceModule,
      resourceType: 'task',
      resourceId: taskId,
      action: 'assign',
      user,
      previousValues: { assignedTo: task.assignedTo },
      newValues: { assignedTo: newAssignees },
    })

    return successResponse(undefined, 'Task reassigned.')
  } catch (error) {
    handleError(error)
  }
})

export const completeTask = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { taskId, comment } = (request.data ?? {}) as { taskId?: string; comment?: string }

    if (!taskId) {
      throw new AppError('invalid-argument', 'taskId is required.')
    }

    const taskRef = db.collection(COLLECTIONS.TASKS).doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new AppError('not-found', 'Task not found.')
    }
    const task = taskSnap.data()!

    if (TERMINAL_TASK_STATUSES.includes(task.taskStatus)) {
      throw new AppError('failed-precondition', `This task is already ${task.taskStatus}.`)
    }
    if (!(task.assignedTo as string[]).includes(user.uid)) {
      throw new AppError('permission-denied', 'Only an assignee can complete this task.')
    }

    await taskRef.update({
      taskStatus: 'completed',
      completedBy: user.uid,
      completedAt: FieldValue.serverTimestamp(),
      completionComment: comment?.trim() || null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'TaskCompleted',
      category: 'Tasks',
      module: task.sourceModule,
      resourceType: 'task',
      resourceId: taskId,
      action: 'complete',
      user,
      metadata: { comment: comment?.trim() || null },
    })

    return successResponse(undefined, 'Task completed.')
  } catch (error) {
    handleError(error)
  }
})

export const cancelTask = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { taskId, reason } = (request.data ?? {}) as { taskId?: string; reason?: string }

    if (!taskId) {
      throw new AppError('invalid-argument', 'taskId is required.')
    }

    const taskRef = db.collection(COLLECTIONS.TASKS).doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new AppError('not-found', 'Task not found.')
    }
    const task = taskSnap.data()!

    if (TERMINAL_TASK_STATUSES.includes(task.taskStatus)) {
      throw new AppError('failed-precondition', `This task is already ${task.taskStatus}.`)
    }
    if (task.assignedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the task creator can cancel it.')
    }

    await taskRef.update({
      taskStatus: 'cancelled',
      cancellationReason: reason?.trim() || null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'TaskCancelled',
      category: 'Tasks',
      module: task.sourceModule,
      resourceType: 'task',
      resourceId: taskId,
      action: 'cancel',
      user,
      metadata: { reason: reason?.trim() || null },
    })

    return successResponse(undefined, 'Task cancelled.')
  } catch (error) {
    handleError(error)
  }
})
