import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import type { ExpenseRequest, ExpenseStatus } from '@/types'
import * as expenseService from '../expenseService'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_VARIANT, formatFinanceDate, formatIdr } from '../financeFormat'

/** expense-request.md §7/§9 — reimbursement requests, scoped by the firestore.rules read grant. */
export function ExpenseRequestListPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ExpenseRequest[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all')

  useEffect(() => {
    return expenseService.subscribeToExpenseRequests(setRequests)
  }, [])

  if (requests === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const pendingCount = requests.filter((r) => r.status === 'pendingApproval').length
  const visible = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Expense Requests</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} awaiting a step in the approval chain</p>
        </div>
        <Button type="button" onClick={() => navigate('/finance/expenses/new')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          New Expense Request
        </Button>
      </div>

      <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ExpenseStatus)}>
        <option value="all">All statuses</option>
        {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {visible.length === 0 ? (
        <EmptyState
          title="No expense requests"
          description={requests.length === 0 ? 'Nothing has been submitted yet.' : 'Nothing matches that status.'}
        />
      ) : (
        visible.map((exp) => (
          <Card
            key={exp.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/finance/expenses/${exp.id}`)}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium text-foreground">
                  {formatIdr(exp.totalAmount)}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{exp.requestNumber}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {exp.purpose} · {formatFinanceDate(exp.expenseDate)}
                </p>
              </div>
              <Badge variant={EXPENSE_STATUS_VARIANT[exp.status]}>{EXPENSE_STATUS_LABELS[exp.status]}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
