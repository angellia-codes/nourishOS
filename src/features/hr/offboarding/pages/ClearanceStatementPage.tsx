import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Lock, Minus } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import * as offboardingService from '../offboardingService'
import type { OffboardingChecklist, Task } from '@/types'

/**
 * §5 item 2 — "Employee Clearance Statement Form", generated rather than
 * collected: a read-only summary of the completed checklist, printed via the
 * browser (same window.print() convention as RecruitmentFunnelReportPage —
 * no PDF library in this app). No exit interview content appears here even
 * though its completion is shown: individual records stay hrManager/superAdmin-only
 * per exit-interview.md §4, and this page is reachable by anyone who can
 * view the offboarding checklist (isHrOrAbove — GM/Director included).
 */
export function ClearanceStatementPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const [checklist, setChecklist] = useState<OffboardingChecklist | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checklistId) return
    Promise.all([offboardingService.getOffboardingChecklist(checklistId), offboardingService.listOffboardingTasks(checklistId)])
      .then(([row, taskRows]) => {
        setChecklist(row)
        setTasks(taskRows)
      })
      .finally(() => setLoading(false))
  }, [checklistId])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!checklist) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState title="Not found" description="That offboarding checklist no longer exists." />
      </div>
    )
  }

  if (checklist.status !== 'completed') {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Not ready yet"
          description="The clearance statement is available once the offboarding checklist is closed."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 print:max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Clearance Statement</h1>
          <p className="text-sm text-muted-foreground">{checklist.employeeName}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border bg-sunken px-3 py-2 text-sm font-medium text-foreground"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-4 text-sm">
        <div>
          <p className="text-muted-foreground">Employee</p>
          <p className="font-medium text-foreground">{checklist.employeeName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Last working date</p>
          <p className="font-medium text-foreground">{checklist.lastWorkingDate}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Completed</p>
          <p className="font-medium text-foreground">{checklist.completedAt ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Exit interview</p>
          <p className="font-medium text-foreground">{checklist.exitInterviewId ? 'Completed' : 'Not recorded'}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Documents</h2>
        <ul className="flex flex-col gap-1">
          {checklist.documentChecklist.map((item) => (
            <li key={item.itemNumber} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
              <span>{item.label}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                {item.status === 'received' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Clearance Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks visible to you for this checklist.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                <span>{task.title}</span>
                <span className="text-muted-foreground">{task.taskStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
