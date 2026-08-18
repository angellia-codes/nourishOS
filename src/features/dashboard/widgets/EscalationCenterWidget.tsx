import { useEffect, useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import * as taskService from '@/services/shared/taskService'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { Task } from '@/types'

const MAX_ROWS = 5
const CLOSED_STATUSES = ['completed', 'verified', 'closed', 'cancelled', 'archived']

/**
 * HR_OPERATIONS.md §9.13's Escalation Center, in its dashboard-widget form:
 * the colour bands the doc names — Yellow at D+2, Orange at D+3, Red at D+5 —
 * are exactly `escalationLevel` 1/2/3+, which the daily-updates escalation job
 * already stamps on each task.
 *
 * §9.9's GM row is narrower ("Escalated Issues, 5+ days"), so level 3+ leads
 * the list; the earlier bands still show because the point of the centre is
 * seeing something before it reaches the GM.
 */
export function EscalationCenterWidget() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return taskService.subscribeToDailyUpdateTasks(
      (rows) => {
        setDenied(false)
        setTasks(rows)
      },
      () => {
        setDenied(true)
        setTasks([])
      },
    )
  }, [])

  const escalated = useMemo(
    () =>
      (tasks ?? [])
        .filter((task) => !CLOSED_STATUSES.includes(task.taskStatus) && (task.escalationLevel ?? 0) >= 1)
        .sort((a, b) => (b.escalationLevel ?? 0) - (a.escalationLevel ?? 0) || (b.daysOpen ?? 0) - (a.daysOpen ?? 0)),
    [tasks],
  )

  return (
    <DashboardWidget
      title="Escalation Center"
      icon={TriangleAlert}
      count={tasks === null ? undefined : escalated.length}
      viewAllTo="/operations/daily-updates"
      loading={tasks === null}
      denied={denied}
      emptyText="Nothing escalated right now."
    >
      <div className="flex flex-col gap-2">
        {escalated.slice(0, MAX_ROWS).map((task) => {
          const level = task.escalationLevel ?? 0
          return (
            <WidgetRow key={task.id} to={`/communications/tasks/${task.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">Open {task.daysOpen ?? 0} day(s)</p>
              </div>
              <StatusPill
                tone={level >= 3 ? 'error' : level === 2 ? 'warning' : 'info'}
                icon={TriangleAlert}
                label={`Level ${level}`}
              />
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
