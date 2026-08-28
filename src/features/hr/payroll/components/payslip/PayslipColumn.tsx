import { formatPayslipAmount } from '../../payslipFormat'
import { PayslipLineRow } from './PayslipLineRow'
import type { PayslipLineItem } from '@/types'

/**
 * One side of the slip — income or deduction (§9/§10).
 *
 * `items` arrives already padded by buildPayslipColumns, so both columns render
 * the same number of rows and the mirror blocks sit level with each other
 * (decision 11). Nil rows are always printed, never suppressed: that is what
 * makes a month-to-month comparison possible.
 */
export function PayslipColumn({
  heading,
  items,
  totalLabel,
  total,
}: {
  heading: string
  items: (PayslipLineItem | null)[]
  totalLabel: string
  total: number
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{heading}</caption>
      <thead>
        <tr className="border-y border-border">
          <th scope="col" className="px-2 py-2 text-left font-semibold">
            {heading}
          </th>
          <th scope="col" className="w-2/5 px-2 py-2 text-right font-semibold">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <PayslipLineRow key={item ? `${item.componentId}-${item.side}` : `blank-${index}`} item={item} />
        ))}
      </tbody>
      <tfoot>
        <tr className="border-y border-border font-semibold">
          <th scope="row" className="px-2 py-2 text-left">
            {totalLabel}
          </th>
          <td className="px-2 py-2 text-right font-mono tabular-nums">{formatPayslipAmount(total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
