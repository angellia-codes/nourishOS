import { useEffect, useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Badge, StatusPill } from '@/components/ui'
import { useAuth } from '@/hooks'
import { taskService } from '@/services/shared'
import { formatDate, isPast } from '@/utils'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
// Formats live with the module that owns the domain — same cross-feature reuse
// as lostFoundFormat.ts:5 pulling from the Daily Updates format module.
import {
  TASK_PRIORITY_VARIANT,
  TASK_STATUS_ICON,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
  isTerminal,
} from '@/features/communications/tasks/taskFormat'
import type { Task } from '@/types'

const MAX_ROWS = 5

/** dashboard.md §10. Open tasks only, soonest due first — subscribeToMyTasks already orders by dueDate. */
export function AssignedTasksWidget() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!uid) return
    return taskService.subscribeToMyTasks(uid, setTasks, () => {
      setDenied(true)
      setTasks([])
    })
  }, [uid])

  const open = useMemo(() => (tasks ?? []).filter((task) => !isTerminal(task.taskStatus)), [tasks])

  return (
    <DashboardWidget
      title="Assigned Tasks"
      icon={ListChecks}
      count={tasks === null ? undefined : open.length}
      viewAllTo="/communications/tasks"
      loading={tasks === null}
      denied={denied}
      emptyText="No assigned tasks."
    >
      <div className="flex flex-col gap-2">
        {open.slice(0, MAX_ROWS).map((task) => {
          const overdue = isPast(task.dueDate)
          return (
            <WidgetRow key={task.id} to={`/communications/tasks/${task.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                <p className={overdue ? 'text-xs text-status-rejected' : 'text-xs text-muted-foreground'}>
                  {task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                <StatusPill
                  tone={overdue ? 'error' : TASK_STATUS_TONE[task.taskStatus]}
                  icon={TASK_STATUS_ICON[overdue ? 'overdue' : task.taskStatus]}
                  label={overdue ? 'Overdue' : TASK_STATUS_LABELS[task.taskStatus]}
                />
              </div>
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
