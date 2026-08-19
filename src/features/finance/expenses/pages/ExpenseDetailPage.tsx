import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, Banknote, Lock, Pencil, Send } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  StatusPill,
  Timeline,
  TimelineItem,
} from '@/components/ui'
import { EmptyState, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import { useAuth, useFirestoreDoc, useFirestoreQuery, useToast } from '@/hooks'
import { approvalService, userService } from '@/services/shared'
import { formatDate, formatDateTime } from '@/utils'
import * as expenseService from '../expenseService'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_ICON,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_TONE,
  formatIdr,
  isEditable,
} from '../expenseFormat'
import type { ApprovalHistoryEntry, ExpenseRequest, FileMetadata } from '@/types'

const HISTORY_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  approve: 'success',
  approve_override: 'success',
  reject: 'error',
  returnForRevision: 'warning',
}

/**
 * The whole expense lifecycle on one page — expense-request.md §4/§7.
 *
 * Receipts live here rather than on the form because createFileMetadata needs an
 * existing resourceId, and §4 Section C makes at least one of them a submission
 * requirement: the Submit button says which requirement is missing instead of
 * going dead.
 *
 * Approve and reject are deliberately absent. They belong to the shared Approval
 * Engine and are the approver's action, not the requester's — the dashboard's
 * Pending Approvals widget is where an approver picks the request up.
 */
export function ExpenseDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { expenseRequestId } = useParams<{ expenseRequestId: string }>()
  const { user } = useAuth()

  const { data: expense, loading, error } = useFirestoreDoc<ExpenseRequest>(
    COLLECTIONS.EXPENSE_REQUESTS,
    expenseRequestId,
  )
  const { data: receipts } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    expenseRequestId
      ? [
          where('resourceType', '==', 'expenseRequest'),
          where('resourceId', '==', expenseRequestId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [expenseRequestId],
  )

  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [paymentReference, setPaymentReference] = useState('')
  const [busy, setBusy] = useState(false)

  const approvalRequestId = expense?.approvalRequestId ?? null

  useEffect(() => {
    if (!approvalRequestId) return
    let cancelled = false
    void approvalService
      .getApprovalHistory(approvalRequestId)
      .then((entries) => {
        if (!cancelled) setHistory(entries)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [approvalRequestId, expense?.status])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !expense || !expenseRequestId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Expense request unavailable"
          description="You can only open your own requests, your department's, or — for Finance — any of them."
        />
      </div>
    )
  }

  const isOwner = expense.requestedBy === user?.uid
  const editable = isOwner && isEditable(expense.status)
  const missingReceipt = receipts.length === 0
  const missingItems = expense.items.length === 0
  const canSubmit = editable && !missingReceipt && !missingItems

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/finance')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Expense Requests
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={EXPENSE_STATUS_TONE[expense.status]}
              icon={EXPENSE_STATUS_ICON[expense.status]}
              label={EXPENSE_STATUS_LABELS[expense.status]}
            />
            <Badge variant="neutral">{EXPENSE_CATEGORY_LABELS[expense.category]}</Badge>
          </div>
          <CardTitle>{expense.requestNumber ?? 'Unsubmitted draft'}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {names[expense.requestedBy] ?? 'Requester'} · spent {formatDate(expense.expenseDate)}
            {expense.paidAt && ` · paid ${formatDateTime(expense.paidAt)}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">{expense.purpose}</p>

          <div className="flex flex-col gap-1.5">
            {expense.items.map((item, index) => (
              <div key={index} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{item.description}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {formatIdr(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {formatIdr(expense.totalAmount)}
              </span>
            </div>
          </div>

          {expense.notes && (
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{expense.notes}</p>
            </div>
          )}

          {expense.paymentReference && (
            <p className="text-xs text-muted-foreground">Payment reference: {expense.paymentReference}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {receipts.length === 0 && !editable ? (
            <p className="text-sm text-muted-foreground">No receipts attached.</p>
          ) : (
            <FileList files={receipts} />
          )}
          {editable && (
            <FileUpload module="finance" resourceType="expenseRequest" resourceId={expenseRequestId} />
          )}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex flex-col items-end gap-2">
          {(missingReceipt || missingItems) && (
            <p className="text-xs text-muted-foreground">
              {missingItems ? 'Add at least one item' : 'Attach at least one receipt'} before submitting.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => navigate(`/finance/expenses/${expenseRequestId}/edit`)}
            >
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Button
              disabled={busy || !canSubmit}
              onClick={() =>
                void run(() => expenseService.submitExpenseRequest(expenseRequestId), 'Submitted for approval.')
              }
            >
              <Send className="mr-1 h-4 w-4" aria-hidden="true" />
              Submit for approval
            </Button>
          </div>
        </div>
      )}

      {expense.status === 'approved' && (
        <PermissionGuard permission={PERMISSIONS.EXPENSE_REQUESTS_PAY}>
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="paymentReference" className="text-sm text-muted-foreground">
                  Payment reference (optional)
                </label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  maxLength={120}
                  placeholder="Transfer reference, voucher number…"
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      expenseService.markExpensePaid({
                        expenseRequestId,
                        paymentReference: paymentReference.trim() || undefined,
                      }),
                    'Marked as paid.',
                  )
                }
              >
                <Banknote className="mr-1 h-4 w-4" aria-hidden="true" />
                Mark paid
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>
      )}

      {expense.status === 'paid' && (
        <PermissionGuard permission={PERMISSIONS.EXPENSE_REQUESTS_PAY}>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await expenseService.closeExpenseRequest(expenseRequestId)
                  navigate('/finance')
                }, 'Expense request closed.')
              }
            >
              <Archive className="mr-1 h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        </PermissionGuard>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval history</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline>
              {history.map((entry) => (
                <TimelineItem
                  key={entry.id}
                  variant={HISTORY_VARIANT[entry.action] ?? 'default'}
                  title={
                    <>
                      <span className="font-medium">{names[entry.approverUid] ?? 'Approver'}</span> — {entry.action}
                      {entry.comments ? `: "${entry.comments}"` : ''}
                    </>
                  }
                  timestamp={formatDateTime(entry.timestamp)}
                />
              ))}
            </Timeline>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
