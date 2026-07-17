import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, Wallet } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { FINANCE_DEPARTMENTS, FINANCE_OUTLETS, MOCK_EXPENSE_REQUESTS, totalAmount } from './financeDemoData'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_VARIANT, formatFinanceDate, formatIdr } from './financeFormat'

function outletName(outletId: string): string {
  return FINANCE_OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

function departmentName(departmentId: string): string {
  return FINANCE_DEPARTMENTS.find((d) => d.id === departmentId)?.name ?? departmentId
}

/**
 * Read-only visual preview of the Expense Requests list — finance.md §5/§10.
 * Mock data, no Firestore subscription, no backend calls.
 */
export function ExpenseRequestListDemoPage() {
  const navigate = useNavigate()
  const pendingCount = MOCK_EXPENSE_REQUESTS.filter((e) => e.status === 'pendingApproval' || e.status === 'submitted').length
  const missingReceiptCount = MOCK_EXPENSE_REQUESTS.filter((e) => !e.hasReceipt && e.status !== 'draft').length

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /finance.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Expense Requests</h1>
            <p className="text-sm text-muted-foreground">Employee reimbursement requests — finance.md §5.</p>
          </div>
          <Button onClick={() => navigate('/demo/finance/expenses/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Expense Request
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{pendingCount} in review</p>
                <p className="text-xs text-muted-foreground">Submitted, awaiting a step in the chain</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{missingReceiptCount} missing receipt</p>
                <p className="text-xs text-muted-foreground">finance.md §19 — receipt attachment is mandatory</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {MOCK_EXPENSE_REQUESTS.length === 0 ? (
          <EmptyState title="No expense requests yet" description="Requests submitted by employees will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_EXPENSE_REQUESTS.map((exp) => (
              <Card
                key={exp.id}
                className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                onClick={() => navigate(`/demo/finance/expenses/${exp.id}`)}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {formatIdr(totalAmount(exp.items))}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{exp.requestNumber}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exp.requestedByName} &middot; {outletName(exp.outletId)} &middot; {departmentName(exp.departmentId)} &middot;{' '}
                        {formatFinanceDate(exp.expenseDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!exp.hasReceipt && exp.status !== 'draft' && <Badge variant="warning">No Receipt</Badge>}
                      <Badge variant={EXPENSE_STATUS_VARIANT[exp.status]}>{EXPENSE_STATUS_LABELS[exp.status]}</Badge>
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
