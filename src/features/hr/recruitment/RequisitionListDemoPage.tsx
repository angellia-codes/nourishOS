import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import {
  MOCK_REQUISITIONS,
  POSITION_LABELS,
  REQUISITION_DEPARTMENTS,
  REQUISITION_OUTLETS,
} from './employeeRequisitionDemoData'
import {
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_VARIANT,
  URGENCY_LABELS,
  URGENCY_VARIANT,
  VACANCY_STAGE_LABELS,
  VACANCY_STAGE_VARIANT,
  formatRequisitionDate,
} from './employeeRequisitionFormat'

function outletName(outletId: string): string {
  return REQUISITION_OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

function departmentName(departmentId: string): string {
  return REQUISITION_DEPARTMENTS.find((d) => d.id === departmentId)?.name ?? departmentId
}

/**
 * Read-only visual preview of the Employee Requisition list — employee-requisition.md
 * §1/§9. Mock data, no Firestore subscription, no backend calls.
 */
export function RequisitionListDemoPage() {
  const navigate = useNavigate()
  const openCount = MOCK_REQUISITIONS.filter(
    (r) => r.status === 'approved' && r.vacancyStage && r.vacancyStage !== 'filled' && r.vacancyStage !== 'closed',
  ).length
  const pendingCount = MOCK_REQUISITIONS.filter((r) => r.status === 'pending_approval').length

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /hr/requisitions.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Employee Requisitions</h1>
            <p className="text-sm text-muted-foreground">Manpower requests — Draft → Approval → Open Vacancy.</p>
          </div>
          <Button onClick={() => navigate('/demo/hr/requisitions/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Requisition
          </Button>
        </div>

        {/* Dashboard hooks — employee-requisition.md §9 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{openCount} open positions</p>
                <p className="text-xs text-muted-foreground">Approved, not yet filled</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{pendingCount} pending approval</p>
                <p className="text-xs text-muted-foreground">Awaiting a step in the chain</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {MOCK_REQUISITIONS.length === 0 ? (
          <EmptyState title="No requisitions yet" description="Manpower requests submitted by outlet leaders will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_REQUISITIONS.map((req) => (
              <Card
                key={req.id}
                className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                onClick={() => navigate(`/demo/hr/requisitions/${req.id}`)}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {req.positionId ? POSITION_LABELS[req.positionId] : req.positionTitleFallback}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{req.requisitionNumber}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {outletName(req.outletId)} &middot; {departmentName(req.departmentId)} &middot; {req.openings} opening
                        {req.openings > 1 ? 's' : ''} &middot; Target join {formatRequisitionDate(req.targetJoinDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={URGENCY_VARIANT[req.urgency]}>{URGENCY_LABELS[req.urgency]}</Badge>
                      <Badge variant={REQUISITION_STATUS_VARIANT[req.status]}>{REQUISITION_STATUS_LABELS[req.status]}</Badge>
                      {req.vacancyStage && (
                        <Badge variant={VACANCY_STAGE_VARIANT[req.vacancyStage]}>{VACANCY_STAGE_LABELS[req.vacancyStage]}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
