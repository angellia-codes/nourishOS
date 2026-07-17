import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardList, LogOut } from 'lucide-react'
import { Badge, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { MOCK_OFFBOARDING_CHECKLISTS, REQUISITION_OUTLETS } from './offboardingDemoData'
import { ROLE_TIER_LABELS, formatOnboardingDate } from './offboardingFormat'

function outletName(outletId: string): string {
  return REQUISITION_OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

function stepProgress(checklist: (typeof MOCK_OFFBOARDING_CHECKLISTS)[number]) {
  const applicableTasks = checklist.tasks.filter((t) => t.applicable)
  const completed = applicableTasks.filter((t) => t.status === 'completed').length
  return { completed, total: applicableTasks.length }
}

/**
 * Read-only visual preview of the Exit / Offboarding Checklist dashboard —
 * employee-onboarding-exit-checklist.md §5. Mock data, no Firestore
 * subscription, no backend calls.
 */
export function OffboardingListDemoPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /hr/offboarding.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Offboarding</h1>
          <p className="text-sm text-muted-foreground">Exit checklist per departing employee — asset return, document handover, settlement, interview.</p>
        </div>

        {MOCK_OFFBOARDING_CHECKLISTS.length === 0 ? (
          <EmptyState title="No exits in progress" description="Checklists generated when an employee resigns will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_OFFBOARDING_CHECKLISTS.map((checklist) => {
              const { completed, total } = stepProgress(checklist)

              return (
                <Card
                  key={checklist.id}
                  className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                  onClick={() => navigate(`/demo/hr/offboarding/${checklist.id}`)}
                >
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{checklist.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {checklist.position} &middot; {outletName(checklist.outletId)} &middot; Last day{' '}
                          {formatOnboardingDate(checklist.lastWorkingDate)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{ROLE_TIER_LABELS[checklist.roleTier]}</Badge>
                        {checklist.status === 'completed' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <LogOut className="h-3 w-3" aria-hidden="true" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                        <div
                          className={`h-full rounded-full ${completed === total ? 'bg-success' : 'bg-warning'}`}
                          style={{ width: `${total === 0 ? 100 : Math.round((completed / total) * 100)}%` }}
                        />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ClipboardList className="h-3 w-3" aria-hidden="true" />
                        {completed}/{total} steps
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
