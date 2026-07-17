import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { FINANCE_DEPARTMENTS, FINANCE_OUTLETS, MOCK_EXPENSE_REQUESTS, totalAmount, type ExpenseApprovalStepStatus } from './financeDemoData'
import {
  EXPENSE_APPROVAL_STEP_LABELS,
  EXPENSE_APPROVAL_STEP_VARIANT,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_VARIANT,
  formatFinanceDate,
  formatIdr,
} from './financeFormat'

function stepIcon(status: ExpenseApprovalStepStatus) {
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
 * Read-only visual preview of a single expense request — finance.md §5
 * (items/categories), §14 (approval workflow). Mock data, no Firestore
 * reads, no backend calls.
 */
export function ExpenseRequestDetailDemoPage() {
  const { expenseId } = useParams<{ expenseId: string }>()
  const navigate = useNavigate()
  const expense = MOCK_EXPENSE_REQUESTS.find((e) => e.id === expenseId)

  if (!expense) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Expense request not found" description="This demo expense request does not exist." />
        </div>
      </div>
    )
  }

  const outlet = FINANCE_OUTLETS.find((o) => o.id === expense.outletId)?.name ?? expense.outletId
  const department = FINANCE_DEPARTMENTS.find((d) => d.id === expense.departmentId)?.name ?? expense.departmentId
  const total = totalAmount(expense.items)

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/finance')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{formatIdr(total)}</h1>
            <p className="text-sm text-muted-foreground">
              {expense.requestNumber} &middot; Requested by {expense.requestedByName} &middot; {formatFinanceDate(expense.expenseDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={EXPENSE_STATUS_VARIANT[expense.status]}>{EXPENSE_STATUS_LABELS[expense.status]}</Badge>
          {!expense.hasReceipt && expense.status !== 'draft' && <Badge variant="warning">No Receipt</Badge>}
        </div>

        {(expense.status === 'rejected' || expense.status === 'returnedForRevision') && expense.rejectionReason && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              <span className="font-medium">{expense.status === 'returnedForRevision' ? 'Returned for revision:' : 'Rejected:'}</span>{' '}
              {expense.rejectionReason}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Outlet" value={outlet} />
            <Field label="Department" value={department} />
            <Field label="Cost Center" value={expense.costCenter} />
            <Field label="Expense Date" value={formatFinanceDate(expense.expenseDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Items</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items added yet — still in draft.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {expense.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                    <div>
                      <p className="text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{EXPENSE_CATEGORY_LABELS[item.category]}</p>
                    </div>
                    <p className="font-medium text-foreground">{formatIdr(item.amount)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-medium text-foreground">
                  <span>Total</span>
                  <span>{formatIdr(total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.approvalSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not submitted yet — still in draft.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {expense.approvalSteps.map((step, i) => (
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
                        <Badge variant={EXPENSE_APPROVAL_STEP_VARIANT[step.status]}>{EXPENSE_APPROVAL_STEP_LABELS[step.status]}</Badge>
                      </div>
                      {step.decidedAt && <p className="text-xs text-muted-foreground">{formatFinanceDate(step.decidedAt)}</p>}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
