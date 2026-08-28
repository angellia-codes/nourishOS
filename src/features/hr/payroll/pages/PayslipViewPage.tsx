import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import * as payrollService from '../payrollService'
import { PayslipDocument } from '../components/payslip'
import type { Payslip } from '@/types'

/**
 * §9/§10 — one payslip, on screen and on paper.
 *
 * Printing is `window.print()` plus a `print:` stylesheet, the convention
 * RecruitmentFunnelReportPage and ClearanceStatementPage already set — there
 * is still no PDF library anywhere in this repo, and browser print-to-PDF
 * covers "export to PDF" natively.
 *
 * A payslip whose batch is not approved is denied by firestore.rules, so it
 * arrives here as null and shows the not-available state.
 */
export function PayslipViewPage() {
  const { payslipId = '' } = useParams()
  const navigate = useNavigate()
  const [payslip, setPayslip] = useState<Payslip | null | undefined>(undefined)

  useEffect(() => {
    if (!payslipId) return
    let cancelled = false
    payrollService
      .getPayslip(payslipId)
      .then((result) => {
        if (!cancelled) setPayslip(result)
      })
      .catch(() => {
        if (!cancelled) setPayslip(null)
      })
    return () => {
      cancelled = true
    }
  }, [payslipId])

  if (payslip === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (payslip === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Payslip not available"
          description="It may not exist, or its batch may not be approved yet — payslips stay sealed until then."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      {/* Chrome is hidden on paper; only the slip itself prints. */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/hr/payroll/batches/${payslip.batchId}`)}
          aria-label="Back to batch"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      <PayslipDocument payslip={payslip} />

      {payslip.supersededByPayslipId && (
        <div className="print:hidden">
          <Button variant="secondary" onClick={() => navigate(`/hr/payroll/payslips/${payslip.supersededByPayslipId}`)}>
            Open the replacement
          </Button>
        </div>
      )}
      {payslip.supersedesPayslipId && (
        <div className="print:hidden">
          <Button variant="secondary" onClick={() => navigate(`/hr/payroll/payslips/${payslip.supersedesPayslipId}`)}>
            Open the payslip this replaces
          </Button>
        </div>
      )}
    </div>
  )
}
