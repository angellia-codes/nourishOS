import { buildPayslipColumns } from '../../payslipFormat'
import { PayslipColumn } from './PayslipColumn'
import { PayslipHeader } from './PayslipHeader'
import { PayslipSignatureBlock } from './PayslipSignatureBlock'
import { PayslipTotals } from './PayslipTotals'
import type { Payslip } from '@/types'

/**
 * The payslip — payroll-components-payslip-design.md §9/§10.
 *
 * A PURE function of one Payslip document. No async config fetch, no component
 * registry lookup, no year resolution: every label, rate and base was
 * denormalized onto the line at issue, so relabelling a component in 2027
 * cannot rewrite a 2026 slip. That is the direct payoff of decision 4, and it
 * is what makes this print-safe.
 *
 * Printing is `window.print()` plus Tailwind `print:` variants — the same
 * convention RecruitmentFunnelReportPage and ClearanceStatementPage set. There
 * is still no PDF library anywhere in this repo.
 */
export function PayslipDocument({ payslip }: { payslip: Payslip }) {
  const { income, deduction } = buildPayslipColumns(payslip)

  return (
    <article className="mx-auto max-w-4xl bg-surface p-6 text-foreground print:max-w-none print:bg-transparent print:p-0">
      <PayslipHeader payslip={payslip} />

      {payslip.supersededByPayslipId && (
        // §11 — a superseded slip keeps rendering, marked. Destroying it would
        // destroy the record that an error occurred.
        <p className="mt-4 border border-error/40 bg-error/5 px-3 py-2 text-sm font-medium text-error print:border-black print:bg-transparent print:text-foreground">
          Superseded — replaced by a correction. This is no longer the payable figure.
        </p>
      )}
      {payslip.supersedesPayslipId && (
        <p className="mt-4 border border-info/40 bg-info/5 px-3 py-2 text-sm font-medium text-info print:border-black print:bg-transparent print:text-foreground">
          Correction — this payslip replaces an earlier one for the same period.
        </p>
      )}

      {/* Two columns side by side, each already padded to the same height so
          the mirror blocks read across as single rows (decision 11). */}
      <div className="mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-2 print:grid-cols-2">
        <PayslipColumn heading="Income" items={income} totalLabel="Total Income" total={payslip.totalIncome} />
        <PayslipColumn
          heading="Deduction"
          items={deduction}
          totalLabel="Total Deduction"
          total={payslip.totalDeduction}
        />
      </div>

      <PayslipTotals payslip={payslip} />
      <PayslipSignatureBlock payslip={payslip} />
    </article>
  )
}
