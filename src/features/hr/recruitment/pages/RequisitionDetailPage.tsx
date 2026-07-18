import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Spinner, Textarea } from '@/components/ui'
import { useAuth, useFirestoreDoc, usePermissions, useRole, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { POSITION_LABELS } from '@/constants/positions'
import type { PositionId } from '@/constants/positions'
import { approvalService } from '@/services/shared'
import type { Requisition } from '@/types'
import * as requisitionService from '../requisitionService'
import {
  EMPLOYMENT_TYPE_LABELS,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_VARIANT,
  REQUISITION_TYPE_LABELS,
  URGENCY_LABELS,
  URGENCY_VARIANT,
  VACANCY_STAGE_LABELS,
  VACANCY_STAGE_VARIANT,
  formatRequisitionDate,
} from '../requisitionFormat'

/** The denormalized route snapshot the Approval Engine stores on the request doc. */
interface ApprovalRequestDoc {
  currentStepIndex: number
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'returnedForRevision' | 'cancelled' | 'completed'
  steps: { sequence: number; approverRole: string }[]
}

const APPROVER_ROLE_LABELS: Record<string, string> = {
  outletManager: 'Outlet Manager',
  hrManager: 'HR Manager',
  generalManager: 'General Manager',
  director: 'Director',
}

function roleLabel(role: string): string {
  return APPROVER_ROLE_LABELS[role] ?? role
}

function positionLabel(req: Requisition): string {
  if (req.positionId && req.positionId in POSITION_LABELS) return POSITION_LABELS[req.positionId as PositionId]
  return req.positionTitleFallback ?? 'Unspecified position'
}

export function RequisitionDetailPage() {
  const { requisitionId } = useParams<{ requisitionId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { roleId } = useRole()
  const { can } = usePermissions()

  const { data: req, loading } = useFirestoreDoc<Requisition>(COLLECTIONS.RECRUITMENTS, requisitionId)
  const { data: approval } = useFirestoreDoc<ApprovalRequestDoc>(COLLECTIONS.APPROVAL_REQUESTS, req?.approvalRequestId)

  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!req) {
    return <p className="text-sm text-muted-foreground">Requisition not found.</p>
  }

  const id = req.id
  const isOwner = user?.uid === req.requestedBy
  const canResubmit = isOwner && (req.status === 'draft' || req.status === 'returnedForRevision')
  const canManage = can(PERMISSIONS.RECRUITMENT_MANAGE)
  const canCancel =
    ((req.status === 'draft' || req.status === 'returnedForRevision') && (isOwner || canManage)) ||
    (req.status === 'approved' && canManage)
  const currentStep = approval?.steps?.[approval.currentStepIndex]
  const isCurrentApprover = req.status === 'pendingApproval' && !!currentStep && roleId === currentStep.approverRole

  async function run(action: () => Promise<unknown>, successMsg: string) {
    setBusy(true)
    try {
      await action()
      toast.success(successMsg)
      setComment('')
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const approvalRequestId = req.approvalRequestId ?? ''

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/recruitment')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{positionLabel(req)}</h1>
          <p className="text-sm text-muted-foreground">
            {req.requisitionNumber && <span className="font-mono">{req.requisitionNumber} · </span>}
            {req.openings} opening{req.openings > 1 ? 's' : ''} · target {formatRequisitionDate(req.targetJoinDate)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={REQUISITION_STATUS_VARIANT[req.status]}>{REQUISITION_STATUS_LABELS[req.status]}</Badge>
        {req.vacancyStage && <Badge variant={VACANCY_STAGE_VARIANT[req.vacancyStage]}>{VACANCY_STAGE_LABELS[req.vacancyStage]}</Badge>}
        <Badge variant={URGENCY_VARIANT[req.urgency]}>{URGENCY_LABELS[req.urgency]}</Badge>
        {!req.budgeted && <Badge variant="warning">Unbudgeted</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted-foreground">
            {REQUISITION_TYPE_LABELS[req.requisitionType]} · {EMPLOYMENT_TYPE_LABELS[req.employmentType]}
            {req.contractMonths ? ` · ${req.contractMonths} months` : ''}
            {req.replacingEmployeeId ? ` · replacing ${req.replacingEmployeeId}` : ''}
          </p>
          <p className="text-foreground">{req.justification}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Detail</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Key Responsibilities</p>
            <p className="text-foreground">{req.responsibilities}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Requirements</p>
            <p className="text-foreground">{req.requirements}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Work Schedule</p>
            <p className="text-foreground">{req.workSchedule}</p>
          </div>
        </CardContent>
      </Card>

      {approval && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {approval.steps.map((step, i) => {
                const done = i < approval.currentStepIndex || approval.approvalStatus === 'approved'
                const rejected = approval.approvalStatus === 'rejected' && i === approval.currentStepIndex
                const active = approval.approvalStatus === 'pending' && i === approval.currentStepIndex
                return (
                  <li key={step.sequence} className="flex items-center gap-3">
                    <span className={done ? 'text-success' : rejected ? 'text-destructive' : active ? 'text-warning' : 'text-muted-foreground'}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : rejected ? <XCircle className="h-5 w-5" /> : active ? <Clock className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>
                    <p className="text-sm font-medium text-foreground">{roleLabel(step.approverRole)}</p>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {canResubmit && (
        <Button type="button" disabled={busy} onClick={() => run(() => requisitionService.submitRequisition(id).then(() => navigate('/hr/recruitment')), 'Submitted for approval.')}>
          {busy ? <Spinner className="h-4 w-4" /> : 'Submit for Approval'}
        </Button>
      )}

      {isCurrentApprover && (
        <Card>
          <CardHeader>
            <CardTitle>Your Decision — {roleLabel(currentStep!.approverRole)} step</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comment">Comment {'(required to reject or return)'}</Label>
              <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy || comment.trim() === ''}
                onClick={() => run(() => approvalService.returnForRevision({ approvalRequestId, comments: comment }), 'Returned for revision.')}
              >
                Return for Revision
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy || comment.trim() === ''}
                onClick={() => run(() => approvalService.rejectStep({ approvalRequestId, comments: comment }), 'Rejected.')}
              >
                Reject
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => run(() => approvalService.approveStep({ approvalRequestId, comments: comment.trim() || undefined }), 'Approved.')}
              >
                {busy ? <Spinner className="h-4 w-4" /> : 'Approve'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canCancel && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => run(() => requisitionService.cancelRequisition(id).then(() => navigate('/hr/recruitment')), 'Requisition cancelled.')}
        >
          Cancel Requisition
        </Button>
      )}
    </div>
  )
}
