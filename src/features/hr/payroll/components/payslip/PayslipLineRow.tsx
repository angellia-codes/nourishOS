import { formatLineAmount, lineLabel } from '../../payslipFormat'
import type { PayslipLineItem } from '@/types'

/**
 * One printed line — payroll-components-payslip-design.md §10.
 *
 * `item` is null for a padding row: buildPayslipColumns inserts blanks so the
 * two columns have equal height and the mirror blocks align (decision 11). A
 * blank still occupies a row, so both columns stay in step.
 *
 * Mirror rows get NO visual marking (decision 12) — deliberately plain, matching
 * the original artifact. `isEmployerMirror` exists in data only, for consumers
 * that need honest figures.
 */
export function PayslipLineRow({ item }: { item: PayslipLineItem | null }) {
  if (!item) {
    return (
      <tr aria-hidden="true">
        <td className="px-2 py-1.5">&nbsp;</td>
        <td className="px-2 py-1.5" />
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/50">
      {/* §10: Title Case, matching the source document — a deliberate exception
          to the design system's sentence-case rule. */}
      <td className="px-2 py-1.5">{lineLabel(item)}</td>
      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatLineAmount(item)}</td>
    </tr>
  )
}
