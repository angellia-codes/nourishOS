import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Badge, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { REQUISITION_OUTLETS } from '@/features/hr/recruitment/employeeRequisitionDemoData'
import { MOCK_ONBOARDING_CHECKLISTS, findEmployee } from './onboardingDemoData'
import { formatOnboardingDate } from './onboardingFormat'

function outletName(outletId: string): string {
  return REQUISITION_OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

function mandatoryProgress(checklist: (typeof MOCK_ONBOARDING_CHECKLISTS)[number]) {
  const mandatory = checklist.items.filter((i) => i.tier === 'mandatory')
  const received = mandatory.filter((i) => i.status === 'received').length
  return { received, total: mandatory.length }
}

/**
 * Read-only visual preview of the Onboarding Document Checklist dashboard —
 * employee-onboarding-exit-checklist.md §4. Mock data, no Firestore
 * subscription, no backend calls.
 */
export function OnboardingListDemoPage() {
  const navigate = useNavigate()

  const followUpOutstanding = MOCK_ONBOARDING_CHECKLISTS.flatMap((checklist) => {
    const employee = findEmployee(checklist.employeeId)
    return checklist.items
      .filter((i) => i.tier === 'followUp' && i.status === 'pending')
      .map((item) => ({ employeeName: employee?.fullName ?? checklist.employeeId, item }))
  })

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /hr/onboarding.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Onboarding</h1>
          <p className="text-sm text-muted-foreground">Document checklist per new hire — generated automatically when a candidate is hired.</p>
        </div>

        {/* Pending Follow-up Documents widget — §2 legend, ** tier */}
        <Card className={followUpOutstanding.length > 0 ? 'border-warning/40' : undefined}>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                followUpOutstanding.length > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {followUpOutstanding.length} pending follow-up document{followUpOutstanding.length === 1 ? '' : 's'}
              </p>
              {followUpOutstanding.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {followUpOutstanding
                    .slice(0, 3)
                    .map((f) => `${f.employeeName} — ${f.item.label}`)
                    .join(' · ')}
                  {followUpOutstanding.length > 3 ? ` · +${followUpOutstanding.length - 3} more` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Nothing outstanding right now.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {MOCK_ONBOARDING_CHECKLISTS.length === 0 ? (
          <EmptyState title="No onboarding checklists yet" description="Checklists generated for new hires will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_ONBOARDING_CHECKLISTS.map((checklist) => {
              const employee = findEmployee(checklist.employeeId)
              if (!employee) return null
              const { received, total } = mandatoryProgress(checklist)
              const blocked = received < total

              return (
                <Card
                  key={checklist.id}
                  className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                  onClick={() => navigate(`/demo/hr/onboarding/${checklist.id}`)}
                >
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{employee.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.position} &middot; {outletName(employee.outletId)} &middot; Start {formatOnboardingDate(checklist.startDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {checklist.status === 'completed' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant={blocked ? 'warning' : 'info'}>
                            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                        <div
                          className={`h-full rounded-full ${blocked ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${total === 0 ? 100 : Math.round((received / total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {received}/{total} mandatory
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
