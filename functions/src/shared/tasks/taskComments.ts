import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { sendNotificationInternal } from '../notifications'
import { recordMentionsInternal } from '../activity'

/**
 * Task comments — TASK_ENGINE.md §5 ("Comments"), communications.md §6.
 *
 * `taskParticipants` is denormalised onto every comment because firestore.rules
 * can only allow a list query whose constraints it can also express: a rule that
 * had to get() the parent task would cost a read per comment and could not be
 * satisfied by a plain `where taskId == …` query. Participants are frozen at
 * write time, so a comment stays visible to whoever was on the task when it was
 * written — reassignment does not retroactively hide the history from them.
 * ponytail: no edit or delete. Add a soft-delete field if a comment ever has to
 * be retracted.
 */
export const addTaskComment = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { taskId, body, mentionedUids: rawMentionedUids } = (request.data ?? {}) as {
      taskId?: string
      body?: string
      mentionedUids?: string[]
    }
    if (!taskId?.trim()) {
      throw new AppError('invalid-argument', 'taskId is required.')
    }
    const comment = body?.trim() ?? ''
    if (!comment) {
      throw new AppError('invalid-argument', 'A comment cannot be empty.')
    }
    if (comment.length > 2000) {
      throw new AppError('invalid-argument', 'Comment must be 2000 characters or fewer.')
    }

    const taskRef = db.collection(COLLECTIONS.TASKS).doc(taskId.trim())
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new AppError('not-found', 'Task not found.')
    }
    const task = taskSnap.data()!

    const assignedTo = (task.assignedTo as string[]) ?? []
    const participants = [...new Set([...assignedTo, task.assignedBy as string])]
    // Same authorization shape as completeTask: the people on the task, not a
    // permission string — a task is not a module.
    if (!participants.includes(user.uid)) {
      throw new AppError('permission-denied', 'Only someone assigned to this task can comment on it.')
    }

    const mentionedUids = Array.isArray(rawMentionedUids) ? rawMentionedUids.filter((uid) => typeof uid === 'string') : []

    const ref = db.collection(COLLECTIONS.TASK_COMMENTS).doc()
    await ref.set({
      taskId: taskRef.id,
      body: comment,
      taskParticipants: participants,
      mentionedUids,
      ...newDocumentBaseFields(user.uid),
    })
    await taskRef.update({ updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid })

    if (mentionedUids.length > 0) {
      await recordMentionsInternal({
        mentionedUids,
        mentionedBy: user.uid,
        mentionedByName: user.displayName,
        sourceModule: 'tasks',
        sourceId: taskRef.id,
        snippet: comment,
        actionUrl: `/communications/tasks/${taskRef.id}`,
      })
    }

    await Promise.all(
      participants
        .filter((recipientUid) => recipientUid !== user.uid)
        .map((recipientUid) =>
          sendNotificationInternal({
            type: 'task',
            title: 'New Comment on a Task',
            message: `${user.displayName} commented on "${task.title}".`,
            module: task.sourceModule,
            priority: 'low',
            recipientUid,
            senderUid: user.uid,
            referenceModule: task.sourceModule,
            referenceId: taskRef.id,
            actionUrl: `/communications/tasks/${taskRef.id}`,
          }),
        ),
    )

    await recordAuditEvent({
      eventType: 'TaskCommentAdded',
      category: 'Tasks',
      module: task.sourceModule,
      resourceType: 'task',
      resourceId: taskRef.id,
      action: 'comment',
      user,
      metadata: { commentId: ref.id },
    })

    return successResponse({ commentId: ref.id }, 'Comment added.')
  } catch (error) {
    return handleError(error)
  }
})
