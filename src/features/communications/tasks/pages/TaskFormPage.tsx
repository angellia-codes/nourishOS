import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { ROLE_LABELS } from '@/constants'
import { PRIORITY, TASK_TYPE, type Priority, type TaskType } from '@/constants/statuses'
import { useAuth, useToast } from '@/hooks'
import { taskService, userService } from '@/services/shared'
import { TASK_TYPE_LABELS } from '../taskFormat'

/**
 * communications.md §6 — create and assign. The assignee list is the staff
 * directory (users/{uid}), readable by any signed-in user so a department leader
 * can assign work, which §19 says they may.
 *
 * `sourceModule` is fixed to 'communications': TASK_ENGINE.md §5 uses it to say
 * which module produced the task, and a hand-created one comes from here.
 */
export function TaskFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [directory, setDirectory] = useState<userService.DirectoryUser[]>([])
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPE.CUSTOM)
  const [priority, setPriority] = useState<Priority>(PRIORITY.MEDIUM)
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [directoryDenied, setDirectoryDenied] = useState(false)

  // A refused directory read is a rules denial, not an empty company — fall
  // back to self-assignment rather than leaving a dead form.
  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => {
        setDirectoryDenied(false)
        setDirectory(users)
      },
      () => setDirectoryDenied(true),
    )
  }, [])

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return directory
    return directory.filter((entry) => entry.displayName.toLowerCase().includes(needle))
  }, [directory, search])

  const canSubmit = title.trim() !== '' && assignedTo.length > 0 && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { taskId } = await taskService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        taskType,
        sourceModule: 'communications',
        assignedTo,
        priority,
        dueDate: dueDate || undefined,
      })
      toast.success('Task created.')
      navigate(`/communications/tasks/${taskId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the task.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">New Task</h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taskTitle">Title</Label>
            <Input id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskType">Type</Label>
              <Select id="taskType" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
                {Object.values(TASK_TYPE).map((value) => (
                  <option key={value} value={value}>
                    {TASK_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskPriority">Priority</Label>
              <Select
                id="taskPriority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {Object.values(PRIORITY).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskDue">Due date</Label>
              <Input id="taskDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign to</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {directoryDenied ? (
            <>
              <p className="text-sm text-muted-foreground">
                The staff directory is unavailable, so only self-assignment is possible right now.
              </p>
              {user && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={assignedTo.includes(user.uid)}
                    onChange={() =>
                      setAssignedTo((ids) => (ids.includes(user.uid) ? [] : [user.uid]))
                    }
                  />
                  Assign to myself
                </label>
              )}
            </>
          ) : (
            <>
              <Input
                placeholder="Search people"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search people"
              />
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {candidates.map((entry) => (
                  <label
                    key={entry.uid}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={assignedTo.includes(entry.uid)}
                      onChange={() =>
                        setAssignedTo((ids) =>
                          ids.includes(entry.uid) ? ids.filter((id) => id !== entry.uid) : [...ids, entry.uid],
                        )
                      }
                    />
                    <span className="truncate">{entry.displayName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ROLE_LABELS[entry.roleId as keyof typeof ROLE_LABELS] ?? entry.roleId}
                    </span>
                  </label>
                ))}
                {candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nobody matches that search.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
          Create task
        </Button>
      </div>
    </div>
  )
}
