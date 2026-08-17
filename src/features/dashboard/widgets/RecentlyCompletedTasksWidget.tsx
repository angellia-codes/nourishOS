import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks'
import { taskService } from '@/services/shared'
import { formatRelativeTime } from '@/utils'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { Task } from '@/types'

const MAX_ROWS = 5

/** dashboard.md §15 "Recently Completed Tasks" — sorted client-side, see taskService.subscribeToMyCompletedTasks. */
export function RecentlyCompletedTasksWidget() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!uid) return
    return taskService.subscribeToMyCompletedTasks(uid, setTasks, () => {
      setDenied(true)
      setTasks([])
    })
  }, [uid])

  const recent = useMemo(
    () =>
      [...(tasks ?? [])]
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
        .slice(0, MAX_ROWS),
    [tasks],
  )

  return (
    <DashboardWidget
      title="Recently Completed"
      icon={CheckCircle2}
      count={tasks === null ? undefined : tasks.length}
      viewAllTo="/communications/tasks"
      loading={tasks === null}
      denied={denied}
      emptyText="Nothing completed yet."
    >
      <div className="flex flex-col gap-2">
        {recent.map((task) => (
          <WidgetRow key={task.id} to={`/communications/tasks/${task.id}`}>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.completedAt ? formatRelativeTime(task.completedAt) : ''}
              </p>
            </div>
          </WidgetRow>
        ))}
      </div>
    </DashboardWidget>
  )
}
