import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Lock } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import { REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS } from '@/features/hr/recruitment/employeeRequisitionDemoData'
import { MOCK_ONBOARDING_CHECKLISTS, findEmployee, type ChecklistItemStatus, type MockChecklistItem } from './onboardingDemoData'
import {
  CHECKLIST_TIER_ORDER,
  EMPLOYEE_STATUS_FIELD_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_VARIANT,
  RECRUITMENT_SOURCE_LABELS,
  TIER_LABELS,
  TIER_VARIANT,
  TREATMENT_LABELS,
  formatOnboardingDate,
} from './onboardingFormat'

/**
 * Read-only-except-for-item-status visual preview of a single onboarding
 * document checklist — employee-onboarding-exit-checklist.md §2 (tiered
 * blocking rules) and §4 (the 27-row IN list, item 30 shown separately as a
 * field per §6). Mock data, no Firestore reads, no backend calls. The
 * "documentReview task cannot close while any mandatory item is pending"
 * rule (acceptance criterion 1) is reproduced client-side via the banner and
 * the disabled state on nothing else — items stay freely toggleable so the
 * blocking condition is easy to demonstrate.
 */
export function OnboardingChecklistDetailDemoPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const source = MOCK_ONBOARDING_CHECKLISTS.find((c) => c.id === checklistId)
  const employee = source ? findEmployee(source.employeeId) : undefined
  const [items, setItems] = useState<MockChecklistItem[]>(source?.items ?? [])

  if (!source || !employee) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Checklist not found" description="This demo onboarding checklist does not exist." />
        </div>
      </div>
    )
  }

  const outlet = REQUISITION_OUTLETS.find((o) => o.id === employee.outletId)?.name ?? employee.outletId
  const department = REQUISITION_DEPARTMENTS.find((d) => d.id === employee.departmentId)?.name ?? employee.departmentId
  const mandatoryPending = items.filter((i) => i.tier === 'mandatory' && i.status !== 'received')
  const blocked = mandatoryPending.length > 0

  function toggleItem(itemNumber: number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemNumber !== itemNumber || item.status === 'notApplicable') return item
        const nextStatus: ChecklistItemStatus = item.status === 'received' ? 'pending' : 'received'
        if (nextStatus === 'received') {
          const verb = item.treatment === 'verify' ? 'Linked & verified' : 'Marked received'
          toast.success(`${verb} (demo) — item ${item.itemNumber} "${item.label}."`)
          return { ...item, status: nextStatus, receivedDate: '2026-07-17' }
        }
        return { ...item, status: nextStatus, receivedDate: undefined }
      }),
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Toggling an item shows a toast; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/onboarding')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.employeeNumber} &middot; {employee.position} &middot; {department} &middot; {outlet}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={source.status === 'completed' ? 'success' : 'info'}>
            {source.status === 'completed' ? 'Completed' : 'In Progress'}
          </Badge>
          <Badge variant="neutral">{EMPLOYEE_STATUS_FIELD_LABELS[source.employeeStatusField]}</Badge>
          <Badge variant="neutral">Started {formatOnboardingDate(source.startDate)}</Badge>
          <Badge variant="neutral">Source: {RECRUITMENT_SOURCE_LABELS[source.recruitmentSource]}</Badge>
        </div>

        <Card className={blocked ? 'border-warning/40' : 'border-success/40'}>
          <CardContent className="flex items-center gap-3 p-4">
            {blocked ? <Lock className="h-5 w-5 text-warning" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
            <p className="text-sm text-foreground">
              {blocked
                ? `Onboarding blocked — ${mandatoryPending.length} mandatory item${mandatoryPending.length > 1 ? 's' : ''} still pending.`
                : 'All mandatory items received — ready to close onboarding.'}
            </p>
          </CardContent>
        </Card>

        {CHECKLIST_TIER_ORDER.map((tier) => {
          const tierItems = items.filter((i) => i.tier === tier)
          if (tierItems.length === 0) return null
          return (
            <Card key={tier}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{TIER_LABELS[tier]}</CardTitle>
                <Badge variant={TIER_VARIANT[tier]}>{tierItems.length}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {tierItems.map((item) => {
                  const disabled = item.status === 'notApplicable' || item.treatment === 'notDigitized' || item.treatment === 'generate'
                  return (
                    <div key={item.itemNumber} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleItem(item.itemNumber)}
                          aria-label={item.status === 'received' ? `Unmark ${item.label}` : `Mark ${item.label} received`}
                          className="mt-0.5 shrink-0 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
                        <Badge variant="neutral">{TREATMENT_LABELS[item.treatment]}</Badge>
                        <Badge variant={ITEM_STATUS_VARIANT[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
