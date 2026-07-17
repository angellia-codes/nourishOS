import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, Eye, EyeOff, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import {
  MOCK_REQUISITIONS,
  POSITION_LABELS,
  REQUISITION_DEPARTMENTS,
  REQUISITION_OUTLETS,
  type ApprovalStepStatus,
} from './employeeRequisitionDemoData'
import {
  APPROVAL_STEP_LABELS,
  APPROVAL_STEP_VARIANT,
  EMPLOYMENT_TYPE_LABELS,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_VARIANT,
  REQUISITION_TYPE_LABELS,
  URGENCY_LABELS,
  URGENCY_VARIANT,
  VACANCY_STAGE_LABELS,
  VACANCY_STAGE_VARIANT,
  formatIdr,
  formatRequisitionDate,
} from './employeeRequisitionFormat'

function stepIcon(status: ApprovalStepStatus) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
    case 'rejected':
      return <XCircle className="h-5 w-5" aria-hidden="true" />
    case 'pending':
      return <Clock className="h-5 w-5" aria-hidden="true" />
    default:
      return <Circle className="h-5 w-5" aria-hidden="true" />
  }
}

/**
 * Read-only visual preview of a single requisition — employee-requisition.md
 * §2 (two-status-field model), §3 (form fields), §5 (approval chain). Mock
 * data, no Firestore reads, no backend calls. Compensation stays hidden
 * behind an explicit reveal to demonstrate the §3 Section C visibility
 * restriction, even though this demo has no real RBAC to enforce it.
 */
export function RequisitionDetailDemoPage() {
  const { requisitionId } = useParams<{ requisitionId: string }>()
  const navigate = useNavigate()
  const [showCompensation, setShowCompensation] = useState(false)
  const requisition = MOCK_REQUISITIONS.find((r) => r.id === requisitionId)

  if (!requisition) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Requisition not found" description="This demo requisition does not exist." />
        </div>
      </div>
    )
  }

  const outlet = REQUISITION_OUTLETS.find((o) => o.id === requisition.outletId)?.name ?? requisition.outletId
  const department = REQUISITION_DEPARTMENTS.find((d) => d.id === requisition.departmentId)?.name ?? requisition.departmentId
  const positionTitle = requisition.positionId ? POSITION_LABELS[requisition.positionId] : requisition.positionTitleFallback

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/requisitions')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{positionTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {requisition.requisitionNumber} &middot; Requested by {requisition.requestedByName} &middot;{' '}
              {formatRequisitionDate(requisition.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={URGENCY_VARIANT[requisition.urgency]}>{URGENCY_LABELS[requisition.urgency]}</Badge>
          <Badge variant={REQUISITION_STATUS_VARIANT[requisition.status]}>{REQUISITION_STATUS_LABELS[requisition.status]}</Badge>
          {requisition.vacancyStage && (
            <Badge variant={VACANCY_STAGE_VARIANT[requisition.vacancyStage]}>{VACANCY_STAGE_LABELS[requisition.vacancyStage]}</Badge>
          )}
          <Badge variant={requisition.budgeted ? 'neutral' : 'warning'}>{requisition.budgeted ? 'Budgeted' : 'Not Budgeted'}</Badge>
        </div>

        {requisition.status === 'rejected' && requisition.rejectionReason && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              <span className="font-medium">Rejected:</span> {requisition.rejectionReason}
            </CardContent>
          </Card>
        )}

        {/* Section A — Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Outlet" value={outlet} />
            <Field label="Department" value={department} />
            <Field label="Openings" value={String(requisition.openings)} />
            <Field label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[requisition.employmentType]} />
            <Field label="Requisition Type" value={REQUISITION_TYPE_LABELS[requisition.requisitionType]} />
            <Field label="Target Join Date" value={formatRequisitionDate(requisition.targetJoinDate)} />
          </CardContent>
        </Card>

        {/* Section B — Justification */}
        <Card>
          <CardHeader>
            <CardTitle>Justification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Field label="Business Justification" value={requisition.justification} block />
            <Field label="Key Responsibilities" value={requisition.responsibilities} block />
            <Field label="Requirements" value={requisition.requirements} block />
            <Field label="Work Schedule / Shift Pattern" value={requisition.workSchedule} block />
          </CardContent>
        </Card>

        {/* Section C — Compensation (restricted visibility) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Compensation</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCompensation((v) => !v)}>
              {showCompensation ? (
                <>
                  <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Reveal
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="text-sm">
            {showCompensation ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Salary Range" value={`${formatIdr(requisition.salaryMin)} – ${formatIdr(requisition.salaryMax)}`} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hidden — visible to HR Manager, GM, Director, and Super Admin only (employee-requisition.md §3 Section C).
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 5 — Approval Chain */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {requisition.approvalSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not submitted yet — still in draft.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {requisition.approvalSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={
                        step.status === 'approved'
                          ? 'text-success'
                          : step.status === 'rejected'
                            ? 'text-destructive'
                            : step.status === 'pending'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                      }
                    >
                      {stepIcon(step.status)}
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {step.role} &middot; {step.approverName}
                        </p>
                        <Badge variant={APPROVAL_STEP_VARIANT[step.status]}>{APPROVAL_STEP_LABELS[step.status]}</Badge>
                      </div>
                      {step.decidedAt && (
                        <p className="text-xs text-muted-foreground">{formatRequisitionDate(step.decidedAt)}</p>
                      )}
                      {step.comment && <p className="mt-1 text-xs text-muted-foreground">"{step.comment}"</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? 'flex flex-col gap-0.5' : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
