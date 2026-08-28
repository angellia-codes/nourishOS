import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Plus, Receipt } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { CROSS_OUTLET_ROLES, ROLES } from '@/constants'
import { useAuth } from '@/hooks'
import { formatDate } from '@/utils'
import * as expenseService from '../expenseService'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_ICON,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_TONE,
  PAYMENT_CATEGORY_LABELS,
  formatIdr,
} from '../expenseFormat'
import type { ExpenseRequest } from '@/types'

/**
 * expense-request.md §7's view column. Finance and elevated roles read every
 * request; everyone else reads their own — two different branches of the
 * firestore.rules read, so two different queries rather than one broad query
 * filtered client-side.
 */
export function ExpenseListPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const uid = user?.uid ?? null

  const seesAll = profile
    ? profile.roleId === ROLES.FINANCE || (CROSS_OUTLET_ROLES as readonly string[]).includes(profile.roleId)
    : false

  const [rows, setRows] = useState<ExpenseRequest[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!uid || !profile) return
    return expenseService.subscribeToExpenseRequests(
      seesAll ? null : uid,
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [uid, profile, seesAll])

  const visible = useMemo(
    () => (rows ?? []).filter((row) => statusFilter === 'all' || row.status === statusFilter),
    [rows, statusFilter],
  )

  const outstanding = useMemo(
    () =>
      (rows ?? [])
        .filter((row) => row.status === 'pendingApproval' || row.status === 'approved')
        .reduce((sum, row) => sum + row.totalAmount, 0),
    [rows],
  )

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Expense requests unavailable"
          description="Your account can't read this register. Ask a super admin to check your role."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Expense Requests</h1>
          <p className="text-sm text-muted-foreground">
            {seesAll ? 'All outlets' : 'Your requests'} · {formatIdr(outstanding)} awaiting approval or payment
          </p>
        </div>
        <Button onClick={() => navigate('/finance/expenses/new')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          New Request
        </Button>
      </div>

      <div className="sm:max-w-xs">
        <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" aria-hidden="true" />}
          title={rows.length === 0 ? 'No expense requests yet' : 'Nothing with that status'}
          description={
            rows.length === 0
              ? 'Create one, attach the receipt, then submit it for approval.'
              : 'Try a different status filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => navigate(`/finance/expenses/${row.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-mono text-xs text-muted-foreground">{row.requestNumber ?? 'Unsubmitted draft'}</p>
                  <p className="truncate font-medium text-foreground">{row.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {EXPENSE_CATEGORY_LABELS[row.category]} · {PAYMENT_CATEGORY_LABELS[row.paymentCategory]} ·{' '}
                    {formatDate(row.expenseDate)}
                  </p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formatIdr(row.totalAmount)}
                  </span>
                  <StatusPill
                    tone={EXPENSE_STATUS_TONE[row.status]}
                    icon={EXPENSE_STATUS_ICON[row.status]}
                    label={EXPENSE_STATUS_LABELS[row.status]}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
