import { formatPayslipAmount } from '../../payslipFormat'
import type { Payslip } from '@/types'

/**
 * §10 — Take Home Pay is a filled highlight row at the bottom left.
 *
 * The column totals above it are deliberately the INFLATED ones: both are
 * raised by the mirror total, exactly as the source Excel prints them (§3,
 * decision 3). The inflation cancels, so take-home is unaffected — and any
 * consumer wanting honest gross filters `isEmployerMirror === false` instead
 * of second-guessing these figures.
 */
export function PayslipTotals({ payslip }: { payslip: Payslip }) {
  return (
    <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t-2 border-foreground pt-3">
      <div className="bg-sunken px-4 py-3 print:border print:border-black print:bg-transparent">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Take Home Pay</p>
        <p className="font-mono text-xl font-semibold tabular-nums">{formatPayslipAmount(payslip.takeHomePay)}</p>
      </div>

      <dl className="text-right text-sm">
        <div className="flex justify-end gap-4">
          <dt className="text-muted-foreground">Total Income</dt>
          <dd className="w-32 font-mono tabular-nums">{formatPayslipAmount(payslip.totalIncome)}</dd>
        </div>
        <div className="flex justify-end gap-4">
          <dt className="text-muted-foreground">Total Deduction</dt>
          <dd className="w-32 font-mono tabular-nums">{formatPayslipAmount(payslip.totalDeduction)}</dd>
        </div>
      </dl>
    </div>
  )
}
