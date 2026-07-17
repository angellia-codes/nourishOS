import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, FileCheck, Lock } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS } from '@/features/hr/recruitment/employeeRequisitionDemoData'
import {
  MOCK_OFFBOARDING_CHECKLISTS,
  type MockDocumentChecklistItem,
  type MockOffboardingTask,
  type OffboardingTaskStatus,
} from './offboardingDemoData'
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_VARIANT,
  ROLE_TIER_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANT,
  TASK_TYPE_LABELS,
  TIER_LABELS,
  TIER_VARIANT,
  TREATMENT_LABELS,
  formatOnboardingDate,
} from './offboardingFormat'

const NEXT_TASK_STATUS: Record<OffboardingTaskStatus, OffboardingTaskStatus> = {
  pending: 'inProgress',
  inProgress: 'completed',
  completed: 'pending',
}

/**
 * Read-only-except-for-status-toggles visual preview of a single exit
 * checklist — employee-onboarding-exit-checklist.md §5 (reconciled task
 * table, conditional Handover List) and §6 (documentChecklist holds only OUT
 * items 1, 6, 9). Mock data, no Firestore reads, no backend calls. The
 * Clearance Statement (item 2) is reproduced as a button that only enables
 * once every applicable step is done, matching acceptance criterion 5
 * ("generates automatically on checklist completion").
 */
export function OffboardingChecklistDetailDemoPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const source = MOCK_OFFBOARDING_CHECKLISTS.find((c) => c.id === checklistId)
  const [docs, setDocs] = useState<MockDocumentChecklistItem[]>(source?.documentChecklist ?? [])
  const [tasks, setTasks] = useState<MockOffboardingTask[]>(source?.tasks ?? [])
  const [status, setStatus] = useState<'inProgress' | 'completed'>(source?.status ?? 'inProgress')
  const [clearanceFileId, setClearanceFileId] = useState<string | undefined>(source?.clearanceStatementFileId)

  if (!source) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Checklist not found" description="This demo exit checklist does not exist." />
        </div>
      </div>
    )
  }

  const sourceId = source.id
  const outlet = REQUISITION_OUTLETS.find((o) => o.id === source.outletId)?.name ?? source.outletId
  const department = REQUISITION_DEPARTMENTS.find((d) => d.id === source.departmentId)?.name ?? source.departmentId
  const applicableTasks = tasks.filter((t) => t.applicable)
  const mandatoryDocsPending = docs.filter((d) => d.tier === 'mandatory' && d.status !== 'received')
  const tasksRemaining = applicableTasks.filter((t) => t.status !== 'completed')
  const ready = mandatoryDocsPending.length === 0 && tasksRemaining.length === 0
  const reassignmentSkipped = tasks.some((t) => t.key === 'reassignment' && !t.applicable)

  function toggleDoc(itemNumber: number) {
    setDocs((prev) =>
      prev.map((item) => {
        if (item.itemNumber !== itemNumber) return item
        const nextStatus = item.status === 'received' ? 'pending' : 'received'
        if (nextStatus === 'received') {
          toast.success(`Marked received (demo) — item ${item.itemNumber} "${item.label}."`)
          return { ...item, status: nextStatus, receivedDate: '2026-07-17' }
        }
        return { ...item, status: nextStatus, receivedDate: undefined }
      }),
    )
  }

  function advanceTask(key: string) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.key !== key || !task.applicable) return task
        const nextStatus = NEXT_TASK_STATUS[task.status]
        toast.success(`${task.title} → ${TASK_STATUS_LABELS[nextStatus]} (demo).`)
        return { ...task, status: nextStatus }
      }),
    )
  }

  function generateClearanceStatement() {
    if (!ready) return
    setClearanceFileId(`file-clearance-${sourceId}.pdf`)
    setStatus('completed')
    toast.success('Clearance Statement generated (demo) — PDF summary produced, nothing written to a backend.')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Toggling items/tasks shows a toast; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/offboarding')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{source.employeeName}</h1>
            <p className="text-sm text-muted-foreground">
              {source.employeeNumber} &middot; {source.position} &middot; {department} &middot; {outlet}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={status === 'completed' ? 'success' : 'warning'}>{status === 'completed' ? 'Completed' : 'In Progress'}</Badge>
          <Badge variant="neutral">{ROLE_TIER_LABELS[source.roleTier]}</Badge>
          <Badge variant="neutral">Last day {formatOnboardingDate(source.lastWorkingDate)}</Badge>
        </div>

        <Card className={ready ? 'border-success/40' : 'border-warning/40'}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              {ready ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" /> : <Lock className="h-5 w-5 text-warning" aria-hidden="true" />}
              <p className="text-sm text-foreground">
                {status === 'completed'
                  ? `Clearance Statement generated — ${clearanceFileId}`
                  : ready
                    ? 'All steps complete — Clearance Statement ready to generate.'
                    : `${mandatoryDocsPending.length + tasksRemaining.length} step${mandatoryDocsPending.length + tasksRemaining.length > 1 ? 's' : ''} remaining before the Clearance Statement can be generated.`}
              </p>
            </div>
            {status !== 'completed' && (
              <Button type="button" size="sm" disabled={!ready} onClick={generateClearanceStatement}>
                <FileCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Generate Clearance Statement
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Document Handover — §6 documentChecklist (OUT items 1, 6, 9) */}
        <Card>
          <CardHeader>
            <CardTitle>Document Handover</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {docs.map((item) => (
              <div key={item.itemNumber} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDoc(item.itemNumber)}
                    aria-label={item.status === 'received' ? `Unmark ${item.label}` : `Mark ${item.label} received`}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  >
                    {item.status === 'received' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">#{item.itemNumber}</span> {item.label}
                    </p>
                    {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                    {item.receivedDate && item.status === 'received' && (
                      <p className="text-xs text-muted-foreground">Received {formatOnboardingDate(item.receivedDate)}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={TIER_VARIANT[item.tier]}>{TIER_LABELS[item.tier]}</Badge>
                  <Badge variant={ITEM_STATUS_VARIANT[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exit tasks — §5 reconciled task table */}
        <Card>
          <CardHeader>
            <CardTitle>Exit Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {applicableTasks.map((task) => (
              <div key={task.key} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TASK_TYPE_LABELS[task.type]} &middot; Assigned to {task.assigneeRole}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={TASK_STATUS_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                  {task.key === 'interview' && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/exit-interview')}>
                      Conduct F009
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => advanceTask(task.key)}>
                    Advance
                  </Button>
                </div>
              </div>
            ))}
            {reassignmentSkipped && (
              <p className="text-xs text-muted-foreground">
                Task/Work Reassignment Review skipped — only generated for backoffice or supervisor-and-above exits (§5 item 8).
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Document treatment legend: {TREATMENT_LABELS.collect} = employee-submitted scan/photo.</p>
      </div>
    </div>
  )
}
