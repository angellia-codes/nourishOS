import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { where, orderBy } from 'firebase/firestore'
import { ArrowLeft, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner, Textarea } from '@/components/ui'
import { FileList } from '@/components/shared'
import { useAuth, useFirestoreDoc, useFirestoreQuery, usePermissions, useRole, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { approvalService } from '@/services/shared'
import type { ExpenseRequest, FileMetadata } from '@/types'
import * as expenseService from '../expenseService'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_LABELS, EXPENSE_STATUS_VARIANT, formatFinanceDate, formatIdr } from '../financeFormat'

/** The denormalized route snapshot the Approval Engine stores on the request doc. */
interface ApprovalRequestDoc {
  currentStepIndex: number
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'returnedForRevision' | 'cancelled' | 'completed'
  steps: { sequence: number; approverRole: string }[]
}

const APPROVER_ROLE_LABELS: Record<string, string> = {
  outletManager: 'Department Manager',
  finance: 'Finance',
  generalManager: 'General Manager',
  director: 'Director',
}

function roleLabel(role: string): string {
  return APPROVER_ROLE_LABELS[role] ?? role
}

export function ExpenseRequestDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { roleId } = useRole()
  const { can } = usePermissions()

  const { data: expense, loading } = useFirestoreDoc<ExpenseRequest>(COLLECTIONS.EXPENSE_REQUESTS, expenseId)
  const { data: approval } = useFirestoreDoc<ApprovalRequestDoc>(COLLECTIONS.APPROVAL_REQUESTS, expense?.approvalRequestId)
  const { data: receipts } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    expenseId
      ? [
          where('resourceType', '==', 'expenseRequest'),
          where('resourceId', '==', expenseId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [expenseId],
  )

  const [comment, setComment] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!expense) {
    return <p className="text-sm text-muted-foreground">Expense request not found.</p>
  }

  const id = expense.id
  const isOwner = user?.uid === expense.requestedBy
  const canResubmit = isOwner && (expense.status === 'draft' || expense.status === 'returnedForRevision')
  const currentStep = approval?.steps?.[approval.currentStepIndex]
  const isCurrentApprover = expense.status === 'pendingApproval' && !!currentStep && roleId === currentStep.approverRole
  const canPay = expense.status === 'approved' && can(PERMISSIONS.EXPENSE_REQUESTS_PAY)

  async function run(action: () => Promise<unknown>, successMsg: string) {
    setBusy(true)
    try {
      await action()
      toast.success(successMsg)
      setComment('')
      setPaymentRef('')
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const approvalRequestId = expense.approvalRequestId ?? ''

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/finance')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{formatIdr(expense.totalAmount)}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{expense.requestNumber}</span> · {formatFinanceDate(expense.expenseDate)}
          </p>
        </div>
      </div>

      <Badge variant={EXPENSE_STATUS_VARIANT[expense.status]} className="w-fit">
        {EXPENSE_STATUS_LABELS[expense.status]}
      </Badge>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{expense.purpose}</p>
          <p className="text-xs text-muted-foreground">
            {EXPENSE_CATEGORY_LABELS[expense.category]}
            {expense.costCenterId && ` · Cost center ${expense.costCenterId}`}
          </p>
          {expense.paymentReference && (
            <p className="text-xs text-muted-foreground">Payment reference: {expense.paymentReference}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {expense.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <div>
                <p className="text-foreground">{item.description}</p>
                {item.category && <p className="text-xs text-muted-foreground">{EXPENSE_CATEGORY_LABELS[item.category]}</p>}
              </div>
              <p className="font-medium text-foreground">{formatIdr(item.amount)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-medium text-foreground">
            <span>Total</span>
            <span>{formatIdr(expense.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <FileList files={receipts} />
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
        <Button type="button" disabled={busy} onClick={() => run(() => expenseService.submitExpenseRequest(id).then(() => navigate('/finance')), 'Submitted for approval.')}>
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

      {canPay && (
        <Card>
          <CardHeader>
            <CardTitle>Mark as Paid</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentRef">Payment Reference *</Label>
              <Input id="paymentRef" placeholder="Bank transfer ref, voucher no…" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={busy || paymentRef.trim() === ''}
                onClick={() => run(() => expenseService.markExpensePaid({ expenseRequestId: id, paymentReference: paymentRef }), 'Marked as paid.')}
              >
                {busy ? <Spinner className="h-4 w-4" /> : 'Confirm Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
