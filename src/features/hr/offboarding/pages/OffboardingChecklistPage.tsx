import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Circle, ClipboardCheck, FileText, Minus, type LucideIcon } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
import * as offboardingService from '../offboardingService'
import type { DocumentChecklistItem, OffboardingChecklist, Task } from '@/types'

const LIST_ROUTE = '/hr/offboarding'

const TIER_SECTIONS: Array<{ tier: DocumentChecklistItem['tier']; title: string; description: string }> = [
  { tier: 'mandatory', title: 'Required', description: 'All of these must be received before offboarding can close.' },
  { tier: 'optional', title: 'Optional', description: 'Collected if available. Never blocks.' },
]

const ITEM_STATUS_LABELS: Record<DocumentChecklistItem['status'], string> = {
  pending: 'Pending',
  received: 'Received',
  notApplicable: 'N/A',
}

const ITEM_STATUS_ICON: Record<DocumentChecklistItem['status'], LucideIcon> = {
  pending: Circle,
  received: Check,
  notApplicable: Minus,
}

/** employee-onboarding-exit-checklist.md §5 — the F01 OUT checklist for one exit. */
export function OffboardingChecklistPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<OffboardingChecklist | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!checklistId) return
    const [row, taskRows] = await Promise.all([
      offboardingService.getOffboardingChecklist(checklistId),
      offboardingService.listOffboardingTasks(checklistId),
    ])
    setChecklist(row)
    setTasks(taskRows)
    setLoading(false)
  }, [checklistId])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!checklist || !checklistId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not found"
          description="That offboarding checklist no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to offboarding
            </Button>
          }
        />
      </div>
    )
  }

  const id = checklistId
  const row = checklist
  const canManage = can(PERMISSIONS.EMPLOYEES_UPDATE)
  const outstanding = row.documentChecklist.filter((item) => item.tier === 'mandatory' && item.status === 'pending')

  async function handleItemChange(itemNumber: number, itemStatus: DocumentChecklistItem['status']) {
    setBusy(true)
    try {
      await offboardingService.updateOffboardingItem({ checklistId: id, itemNumber, itemStatus })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update that item.')
    } finally {
      setBusy(false)
    }
  }

  async function handleComplete() {
    setBusy(true)
    try {
      await offboardingService.completeOffboarding(id)
      toast.success('Offboarding complete.')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not close the checklist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_ROUTE)} aria-label="Back to offboarding">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{row.employeeName}</h1>
            <p className="text-sm text-muted-foreground">
              Last day {row.lastWorkingDate} ·{' '}
              {row.status === 'completed' ? 'Complete' : `${outstanding.length} required outstanding`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission={PERMISSIONS.EXIT_INTERVIEWS_VIEW}>
            {row.exitInterviewId ? (
              <StatusPill tone="success" icon={Check} label="Exit interview done" />
            ) : (
              <Button variant="secondary" onClick={() => navigate(`/hr/offboarding/${id}/exit-interview`)}>
                <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Conduct exit interview
              </Button>
            )}
          </PermissionGuard>
          {row.status === 'completed' && (
            <Button variant="secondary" onClick={() => navigate(`/hr/offboarding/${id}/statement`)}>
              <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Clearance statement
            </Button>
          )}
        </div>
      </div>

      <p className="rounded-md bg-sunken p-3 text-xs text-muted-foreground">
        Upload scans, not originals — HR photocopies and returns the original document straight away.
      </p>

      {TIER_SECTIONS.map((section) => {
        const items = row.documentChecklist.filter((item) => item.tier === section.tier)
        if (items.length === 0) return null

        return (
          <section key={section.tier} className="flex flex-col gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>

            {items.map((item) => (
              <Card key={item.itemNumber}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <p className="text-sm text-foreground">
                    <span className="font-mono text-xs text-muted-foreground">{item.itemNumber}. </span>
                    {item.label}
                  </p>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill
                      tone={item.status === 'received' ? 'success' : item.status === 'notApplicable' ? 'neutral' : 'draft'}
                      icon={ITEM_STATUS_ICON[item.status]}
                      label={ITEM_STATUS_LABELS[item.status]}
                    />
                    {canManage && row.status !== 'completed' && (
                      <Select
                        aria-label={`Status for item ${item.itemNumber}`}
                        value={item.status}
                        disabled={busy}
                        onChange={(e) => handleItemChange(item.itemNumber, e.target.value as DocumentChecklistItem['status'])}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="notApplicable">N/A</option>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )
      })}

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tasks</h2>
          <p className="text-xs text-muted-foreground">
            {row.handoverRequired
              ? 'Includes a Task/Work Reassignment Review — this role is backoffice or supervisor level and above.'
              : 'No Task/Work Reassignment Review — this role is floor/service staff.'}
          </p>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks visible to you for this checklist.</p>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <p className="text-sm text-foreground">{task.title}</p>
                <StatusPill
                  tone={task.taskStatus === 'completed' ? 'success' : 'draft'}
                  icon={task.taskStatus === 'completed' ? Check : Circle}
                  label={task.taskStatus}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {canManage && row.status !== 'completed' && (
        <div className="flex justify-end">
          <Button onClick={handleComplete} disabled={outstanding.length > 0} loading={busy}>
            {outstanding.length > 0 ? `${outstanding.length} required outstanding` : 'Close offboarding'}
          </Button>
        </div>
      )}
    </div>
  )
}
