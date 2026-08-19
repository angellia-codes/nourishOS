import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Lock, MessageSquare, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  StatusPill,
} from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { MentionAutocomplete } from '@/features/communications/chat/components/MentionAutocomplete'
import { COLLECTIONS } from '@/constants'
import { useAuth, useFirestoreDoc, useToast } from '@/hooks'
import { taskService, userService } from '@/services/shared'
import { formatDate, formatDateTime, formatRelativeTime, isPast } from '@/utils'
import {
  TASK_PRIORITY_VARIANT,
  TASK_STATUS_ICON,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
  TASK_TYPE_LABELS,
  isTerminal,
} from '../taskFormat'
import type { Task, TaskComment } from '@/types'

/**
 * communications.md §6 — the task, its comments, and the two actions the Task
 * Engine actually implements. §6's Accept / Waiting / Verified / Closed stages
 * are not wired: functions/src/shared/tasks/tasks.ts only ever writes assigned,
 * completed and cancelled, and inventing client-side states it can't persist
 * would be a lie in the UI.
 */
export function TaskDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { taskId } = useParams<{ taskId: string }>()
  const { user } = useAuth()

  const { data: task, loading, error } = useFirestoreDoc<Task>(COLLECTIONS.TASKS, taskId)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [mentionedUids, setMentionedUids] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!taskId) return
    return taskService.subscribeToTaskComments(taskId, setComments, () => setComments([]))
  }, [taskId])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  function nameOf(uid: string): string {
    return names[uid] ?? uid
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !task || !taskId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Task unavailable"
          description="You can only open a task you were assigned or that you created."
        />
      </div>
    )
  }

  const uid = user?.uid
  const isAssignee = uid ? task.assignedTo.includes(uid) : false
  const isCreator = task.assignedBy === uid
  const terminal = isTerminal(task.taskStatus)
  const overdue = !terminal && isPast(task.dueDate)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/communications/tasks')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Tasks
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={overdue ? 'error' : TASK_STATUS_TONE[task.taskStatus]}
              icon={TASK_STATUS_ICON[overdue ? 'overdue' : task.taskStatus]}
              label={overdue ? 'Overdue' : TASK_STATUS_LABELS[task.taskStatus]}
            />
            <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
            <Badge variant="neutral">{TASK_TYPE_LABELS[task.taskType]}</Badge>
          </div>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {task.description && <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>}

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Assigned to</dt>
              <dd className="text-foreground">{task.assignedTo.map(nameOf).join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned by</dt>
              <dd className="text-foreground">{nameOf(task.assignedBy)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Source</dt>
              <dd className="text-foreground">{task.sourceModule}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd className={overdue ? 'text-status-rejected' : 'text-foreground'}>
                {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
              </dd>
            </div>
          </dl>

          {task.taskStatus === 'completed' && (
            <p className="text-xs text-muted-foreground">
              Completed by {nameOf(task.completedBy ?? '')} on {formatDateTime(task.completedAt)}
              {task.completionComment ? ` — "${task.completionComment}"` : ''}
            </p>
          )}
          {task.taskStatus === 'cancelled' && task.cancellationReason && (
            <p className="text-xs text-muted-foreground">Cancelled — {task.cancellationReason}</p>
          )}
        </CardContent>
      </Card>

      {!terminal && (isAssignee || isCreator) && (
        <div className="flex flex-wrap justify-end gap-2">
          {isCreator && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => taskService.cancelTask({ taskId }), 'Task cancelled.')}
            >
              <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
              Cancel task
            </Button>
          )}
          {isAssignee && (
            <Button
              disabled={busy}
              onClick={() => void run(() => taskService.completeTask({ taskId }), 'Task completed.')}
            >
              <Check className="mr-1 h-4 w-4" aria-hidden="true" />
              Mark complete
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {comments.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              No comments yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    {nameOf(comment.createdBy)} · {formatRelativeTime(comment.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}

          {(isAssignee || isCreator) && (
            <div className="flex flex-col gap-2">
              <MentionAutocomplete
                value={draft}
                onValueChange={setDraft}
                mentionedUids={mentionedUids}
                onMentionedUidsChange={setMentionedUids}
                rows={3}
                maxLength={2000}
                placeholder="Add a comment — type @ to mention someone"
              />
              <Button
                className="self-end"
                disabled={busy || draft.trim() === ''}
                onClick={() =>
                  void run(async () => {
                    await taskService.addTaskComment({ taskId, body: draft.trim(), mentionedUids })
                    setDraft('')
                    setMentionedUids([])
                  }, 'Comment added.')
                }
              >
                Comment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
