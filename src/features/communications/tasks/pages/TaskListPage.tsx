import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner, StatusPill, Tabs, TabPanel } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAuth } from '@/hooks'
import { taskService } from '@/services/shared'
import { formatDate, isPast } from '@/utils'
import {
  TASK_PRIORITY_VARIANT,
  TASK_STATUS_ICON,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
  TASK_TYPE_LABELS,
  isTerminal,
} from '../taskFormat'
import type { Task } from '@/types'

type TabValue = 'mine' | 'assigned'

/**
 * communications.md §6, backed by the shared Task Engine — this page is the
 * first surface for tasks the HR, Operations and Incident modules have been
 * creating all along.
 *
 * Two queries, not one: `assignedTo array-contains me` and `assignedBy == me`
 * are the two branches of the tasks read rule, and a single broader query would
 * return rows that fail it and kill the whole subscription.
 */
export function TaskListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [tab, setTab] = useState<TabValue>('mine')
  const [mine, setMine] = useState<Task[] | null>(null)
  const [assigned, setAssigned] = useState<Task[] | null>(null)
  const [showDone, setShowDone] = useState('open')

  useEffect(() => {
    if (!uid) return
    return taskService.subscribeToMyTasks(uid, setMine, () => setMine([]))
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return taskService.subscribeToTasksAssignedByMe(uid, setAssigned, () => setAssigned([]))
  }, [uid])

  const rows = tab === 'mine' ? mine : assigned
  const visible = useMemo(
    () => (rows ?? []).filter((task) => (showDone === 'all' ? true : !isTerminal(task.taskStatus))),
    [rows, showDone],
  )

  const openCount = (mine ?? []).filter((task) => !isTerminal(task.taskStatus)).length

  if (mine === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} open task{openCount === 1 ? '' : 's'} assigned to you
          </p>
        </div>
        <Button onClick={() => navigate('/communications/tasks/new')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          New Task
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as TabValue)}
        items={[
          { value: 'mine', label: 'Assigned to me' },
          { value: 'assigned', label: 'Assigned by me' },
        ]}
      />

      <div className="sm:max-w-xs">
        <Select aria-label="Filter by state" value={showDone} onChange={(e) => setShowDone(e.target.value)}>
          <option value="open">Open only</option>
          <option value="all">Everything</option>
        </Select>
      </div>

      <TabPanel value={tab} activeValue={tab}>
        {visible.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-8 w-8" aria-hidden="true" />}
            title={tab === 'mine' ? 'Nothing assigned to you' : 'You have not assigned anything'}
            description={
              tab === 'mine'
                ? 'Tasks from HR, Operations and anyone who assigns you work land here.'
                : 'Tasks you create for other people are listed here.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((task) => {
              const overdue = !isTerminal(task.taskStatus) && isPast(task.dueDate)
              return (
                <Card key={task.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/communications/tasks/${task.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate font-medium text-foreground">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {TASK_TYPE_LABELS[task.taskType]} · {task.sourceModule}
                        {task.dueDate && (
                          <span className={overdue ? 'text-status-rejected' : undefined}>
                            {' '}
                            · due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                      <StatusPill
                        tone={overdue ? 'error' : TASK_STATUS_TONE[task.taskStatus]}
                        icon={TASK_STATUS_ICON[overdue ? 'overdue' : task.taskStatus]}
                        label={overdue ? 'Overdue' : TASK_STATUS_LABELS[task.taskStatus]}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
