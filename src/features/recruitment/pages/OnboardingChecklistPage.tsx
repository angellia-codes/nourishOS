import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Circle, Minus, UserPlus, type LucideIcon } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import type { DocumentChecklistItem, OnboardingChecklist } from '@/types'

const LIST_ROUTE = '/recruitment/onboarding'

/**
 * The F01 IN checklist for one hire — employee-onboarding-exit-checklist.md §4.
 *
 * Grouped by the form's own tiers so the blocking items are visibly separate
 * from the ones that may follow later: `mandatory` (*) blocks completion,
 * `followUp` (**) stays outstanding without blocking, `optional` never nudges,
 * and `process` rows are checkboxes with no document behind them.
 *
 * "Verify" rows point at a record the system already holds (the candidate, the
 * requisition and its approval) — marking them received is a confirmation that
 * someone looked, not a request for another upload. File attachment itself is
 * not wired here yet: the Storage upload flow (FileUpload / createFileMetadata)
 * lands separately, and `fileId` on each row is where it will hook in.
 */

const TIER_SECTIONS: Array<{ tier: DocumentChecklistItem['tier']; title: string; description: string }> = [
  { tier: 'mandatory', title: 'Required', description: 'All of these must be received before onboarding can close.' },
  { tier: 'followUp', title: 'May follow later', description: 'Outstanding but not blocking — chase these up.' },
  { tier: 'optional', title: 'Optional', description: 'Collected if available. Never blocks, never chased.' },
  { tier: 'process', title: 'Process steps', description: 'Checkboxes — no document to collect.' },
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

export function OnboardingChecklistPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!checklistId) return
    setChecklist(await recruitmentService.getOnboardingChecklist(checklistId))
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
          description="That onboarding checklist no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to onboarding
            </Button>
          }
        />
      </div>
    )
  }

  // Plain locals so the guard's narrowing holds inside the handlers.
  const id = checklistId
  const row = checklist
  const canManage = can(PERMISSIONS.RECRUITMENT_UPDATE)
  const outstanding = row.documentChecklist.filter((item) => item.tier === 'mandatory' && item.status === 'pending')

  async function handleItemChange(itemNumber: number, itemStatus: DocumentChecklistItem['status']) {
    setBusy(true)
    try {
      await recruitmentService.updateOnboardingItem({ checklistId: id, itemNumber, itemStatus })
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
      await recruitmentService.completeOnboarding(id)
      toast.success('Onboarding complete.')
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
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_ROUTE)} aria-label="Back to onboarding">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{row.candidateName}</h1>
            <p className="text-sm text-muted-foreground">
              {row.joinDate ? `Joins ${row.joinDate}` : 'No join date'} ·{' '}
              {row.status === 'completed' ? 'Complete' : `${outstanding.length} required outstanding`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!row.employeeId && canManage && (
            <Button onClick={() => navigate(`/hr/employees/new?candidateId=${row.candidateId}`)}>
              <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
              Create employee record
            </Button>
          )}
          {row.employeeId && (
            <Button variant="secondary" onClick={() => navigate(`/hr/employees/${row.employeeId}`)}>
              View employee
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
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-mono text-xs text-muted-foreground">{item.itemNumber}. </span>
                      {item.label}
                    </p>
                    {item.treatment === 'verify' && (
                      <p className="text-xs text-muted-foreground">
                        Already on file — confirm rather than re-collect.
                      </p>
                    )}
                  </div>

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

      {canManage && row.status !== 'completed' && (
        <div className="flex justify-end">
          <Button onClick={handleComplete} disabled={outstanding.length > 0} loading={busy}>
            {outstanding.length > 0 ? `${outstanding.length} required outstanding` : 'Close onboarding'}
          </Button>
        </div>
      )}
    </div>
  )
}
