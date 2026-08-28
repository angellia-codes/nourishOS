import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Lock,
  Send,
  Settings2,
  SlidersHorizontal,
  Upload,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, Select, Spinner, StatusPill, type StatusTone } from '@/components/ui'
import { EmptyState, PermissionGuard, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS, PERMISSIONS } from '@/constants'
import { formatCurrency } from '@/utils'
import * as payrollService from '../payrollService'
import { formatPeriod } from '../payslipFormat'
import type { PayrollBatch, PayrollBatchStatus } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

/**
 * Each module owns its own status → {tone, icon, label} mapping; StatusPill
 * stays generic. Never colour alone — the icon carries the same meaning.
 */
export const BATCH_STATUS_DISPLAY: Record<PayrollBatchStatus, { tone: StatusTone; icon: LucideIcon; label: string }> = {
  draft: { tone: 'draft', icon: CircleDashed, label: 'Draft' },
  submitted: { tone: 'info', icon: Send, label: 'Submitted' },
  pendingApproval: { tone: 'warning', icon: Clock, label: 'Pending approval' },
  approved: { tone: 'success', icon: CheckCircle2, label: 'Approved' },
  rejected: { tone: 'error', icon: XCircle, label: 'Rejected' },
  completed: { tone: 'closed', icon: CheckCircle2, label: 'Completed' },
}

function buildColumns(onOpen: (batchId: string) => void): ReportTableColumn<PayrollBatch>[] {
  return [
    { header: 'Period', value: (b) => formatPeriod(b.period) },
    { header: 'Outlet', value: (b) => (b.outletId ? (OUTLET_NAMES[b.outletId] ?? b.outletId) : 'All outlets') },
    { header: 'Employees', value: (b) => String(b.rowCount), align: 'right' },
    { header: 'Take home pay', value: (b) => formatCurrency(b.totals.totalTakeHomePay), align: 'right' },
    { header: 'Employer cost', value: (b) => formatCurrency(b.totals.totalEmployerCost), align: 'right' },
    {
      header: 'Status',
      value: (b) => {
        const display = BATCH_STATUS_DISPLAY[b.status]
        return display ? (
          <StatusPill tone={display.tone} icon={display.icon} label={display.label} />
        ) : (
          <StatusPill tone="neutral" icon={CircleDashed} label={b.status} />
        )
      },
    },
    {
      header: '',
      align: 'right',
      value: (b) => (
        <Button variant="ghost" size="sm" onClick={() => onOpen(b.id)}>
          Open
        </Button>
      ),
    },
  ]
}

/**
 * payroll-components-payslip-design.md §9 — the batch register, and the
 * module's landing page.
 *
 * A month is a batch, not a pile of rows: the batch is what gets approved, and
 * its payslips only become readable when it does. Individual payslips are
 * reached through the batch rather than listed here.
 */
export function PayrollBatchListPage() {
  const navigate = useNavigate()
  const [batches, setBatches] = useState<PayrollBatch[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [periodFilter, setPeriodFilter] = useState('')

  useEffect(() => {
    return payrollService.subscribeToPayrollBatches(
      (next) => {
        setDenied(false)
        setBatches(next)
      },
      () => {
        setDenied(true)
        setBatches([])
      },
    )
  }, [])

  const periods = useMemo(
    () =>
      Array.from(new Set((batches ?? []).map((b) => b.period)))
        .sort()
        .reverse(),
    [batches],
  )

  const rows = useMemo(
    () => (batches ?? []).filter((b) => !periodFilter || b.period === periodFilter),
    [batches, periodFilter],
  )

  const columns = useMemo(() => buildColumns((batchId) => navigate(`/hr/payroll/batches/${batchId}`)), [navigate])

  if (batches === null) {
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
          title="Access restricted"
          description="Payroll is limited to HR Manager, Finance, GM, Director and Super Admin."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            One batch per period. Payslips become readable once the batch is approved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission={PERMISSIONS.PAYROLL_MANAGE_COMPONENTS}>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll/components')}>
              <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Components
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.PAYROLL_MANAGE_PARAMETERS}>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll/parameters')}>
              <Settings2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Parameters
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.PAYROLL_IMPORT}>
            <Button onClick={() => navigate('/hr/payroll/import')}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Import
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          aria-label="Filter by period"
          className="max-w-xs"
        >
          <option value="">All periods</option>
          {periods.map((period) => (
            <option key={period} value={period}>
              {formatPeriod(period)}
            </option>
          ))}
        </Select>
        <Button variant="ghost" size="sm" onClick={() => navigate('/hr/payroll/revenue')}>
          Monthly revenue
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No payroll batches yet"
          description="Import a month's CSV to create the first batch."
        />
      ) : (
        <ReportTable columns={columns} rows={rows} rowKey={(b) => b.id} />
      )}
    </div>
  )
}
