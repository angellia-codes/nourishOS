import { formatPeriod } from '../../payslipFormat'
import type { Payslip } from '@/types'

/**
 * §10 — the header block: Employee ID, Name, Outlet, Status, Position,
 * Salary Month.
 *
 * Every value was resolved from the employee record at import and frozen onto
 * the payslip (decision 7), so this reads only what is stored. `taxStatus` is
 * the PPh 21 personal status (K0, TK1, …) the source slip prints as "Status".
 *
 * §14 open item 3, accepted: on records predating the 2026-08-17 position
 * validation, `position` may hold a department name rather than a job title.
 * Because payslips are immutable snapshots that value is permanent on slips
 * already issued — cosmetic, and not something the renderer should paper over.
 */
export function PayslipHeader({ payslip }: { payslip: Payslip }) {
  const fields: [string, string][] = [
    ['Employee ID', payslip.employeeNumber],
    ['Name', payslip.fullName],
    ['Outlet', payslip.outletName],
    ['Status', payslip.taxStatus ?? '-'],
    ['Position', payslip.position || '-'],
    ['Salary Month', formatPeriod(payslip.period)],
  ]

  return (
    <header>
      <h1 className="text-lg font-semibold">Payslip</h1>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
