import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleDashed, Send } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS, PERMISSIONS } from '@/constants'
import { formatCurrency } from '@/utils'
import { useToast } from '@/hooks'
import * as payrollService from '../payrollService'
import { formatPeriod } from '../payslipFormat'
import { BATCH_STATUS_DISPLAY } from './PayrollBatchListPage'
import { ValidationIssueList } from '../components/import'
import type { PayrollBatch, Payslip } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))

/**
 * One batch — payroll-components-payslip-design.md §9.
 *
 * Before approval this is the whole view of the month: the batch totals and
 * its reconciliation warnings. The payslip list only populates once the batch
 * is approved, because `firestore.rules` denies an unissued payslip outright
 * — an empty list here is the access rule working, not a missing read.
 */
export function PayrollBatchDetailPage() {
  const { batchId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [batch, setBatch] = useState<PayrollBatch | null | undefined>(undefined)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!batchId) return
    return payrollService.subscribeToPayrollBatch(batchId, setBatch, () => setBatch(null))
  }, [batchId])

  useEffect(() => {
    if (!batchId) return
    return payrollService.subscribeToBatchPayslips(batchId, setPayslips, () => setPayslips([]))
  }, [batchId])

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await payrollService.submitPayrollBatch(batchId)
      toast.success('Submitted for approval. Finance reviews it first.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the batch.')
    } finally {
      setSubmitting(false)
    }
  }

  if (batch === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (batch === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Batch not found" description="It may have been removed, or you may not have access." />
      </div>
    )
  }

  const canSubmit = batch.status === 'draft' || batch.status === 'rejected'
  const issued = batch.status === 'approved' || batch.status === 'completed'

  const columns: ReportTableColumn<Payslip>[] = [
    { header: 'Employee', value: (p) => p.employeeNumber },
    { header: 'Name', value: (p) => p.fullName },
    { header: 'Outlet', value: (p) => p.outletName },
    { header: 'Take home pay', value: (p) => formatCurrency(p.takeHomePay), align: 'right' },
    {
      header: '',
      align: 'right',
      value: (p) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/hr/payroll/payslips/${p.id}`)}>
          {p.supersededByPayslipId ? 'View (superseded)' : 'View slip'}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/payroll')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{formatPeriod(batch.period)}</h1>
            <p className="text-sm text-muted-foreground">
              {batch.outletId ? (OUTLET_NAMES[batch.outletId] ?? batch.outletId) : 'All outlets'} · {batch.rowCount}{' '}
              employee(s) · {batch.sourceFileName}
            </p>
          </div>
        </div>
        {canSubmit && (
          <PermissionGuard permission={PERMISSIONS.PAYROLL_IMPORT}>
            <Button onClick={handleSubmit} loading={submitting}>
              <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Submit for approval
            </Button>
          </PermissionGuard>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Totals</CardTitle>
          {(() => {
            const display = BATCH_STATUS_DISPLAY[batch.status]
            return display ? (
              <StatusPill tone={display.tone} icon={display.icon} label={display.label} />
            ) : (
              <StatusPill tone="neutral" icon={CircleDashed} label={batch.status} />
            )
          })()}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
            <Figure label="Total income" value={formatCurrency(batch.totals.totalIncome)} />
            <Figure label="Total deduction" value={formatCurrency(batch.totals.totalDeduction)} />
            <Figure label="Take home pay" value={formatCurrency(batch.totals.totalTakeHomePay)} />
            <Figure label="Employer contributions" value={formatCurrency(batch.totals.totalEmployerCost)} />
          </dl>
          {/* §3/§4.4 — the first two figures include the mirror on both sides by
              design. Saying so here stops anyone reconciling them against a
              cost report and concluding one of the two is broken. */}
          <p className="mt-3 text-xs text-muted-foreground">
            Income and deduction totals each include {formatCurrency(batch.totals.totalEmployerCost)} of employer
            contributions, which appear on both sides of the slip and net to zero. Take home pay is unaffected.
          </p>
        </CardContent>
      </Card>

      {batch.reconciliation.overriddenRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statutory overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {batch.reconciliation.overriddenRows.join(', ')} bypassed the statutory recompute with a recorded reason.
            </p>
          </CardContent>
        </Card>
      )}

      {batch.reconciliation.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Warnings from import</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationIssueList issues={batch.reconciliation.warnings} severity="warning" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <EmptyState
              title={issued ? 'No payslips' : 'Payslips are not readable yet'}
              description={
                issued
                  ? 'This batch is approved but holds no payslips.'
                  : 'The payslips exist but stay sealed until the batch is approved — that is what the approval authorises.'
              }
            />
          ) : (
            <ReportTable columns={columns} rows={payslips} rowKey={(p) => p.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
