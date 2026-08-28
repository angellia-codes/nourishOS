import { STATUTORY_COMPONENTS } from '@/constants/payroll'
import type { Payslip, PayslipLineItem } from '@/types'

/**
 * Payslip render rules — payroll-components-payslip-design.md §10.
 *
 * Replicates the source Excel artifact. Everything here is a pure function of
 * one stored Payslip: the renderer performs no lookups, which is the direct
 * payoff of decision 4 (immutable snapshot) and what makes PayslipDocument
 * print-safe.
 */

/** §10 — comma thousand separators, e.g. 18,500,000. No currency symbol on the slip. */
export function formatPayslipAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)
}

const STATUTORY_IDS = new Set(Object.keys(STATUTORY_COMPONENTS))

/**
 * §10 — nil values render as `-` on statutory lines and blank on discretionary
 * ones, matching the source. Nil ROWS are never suppressed: printing them is
 * what enables month-to-month comparison.
 */
export function formatLineAmount(item: PayslipLineItem): string {
  if (item.amount !== 0) return formatPayslipAmount(item.amount)
  return STATUTORY_IDS.has(item.componentId) ? '-' : ''
}

/** §10 — English labels; statutory programs keep their legal Indonesian name. */
export function lineLabel(item: PayslipLineItem): string {
  return item.labelEn
}

/**
 * §10, decision 11 — the two columns are padded so the mirror blocks sit on
 * the same rows.
 *
 * The reference slip has 17 income lines against 12 deductions, and the last
 * five of each are the mirror pair. Aligning on the first mirror row (rather
 * than simply padding the shorter column at the end) is what makes each
 * employer contribution read across as one row instead of two unrelated ones.
 */
export function buildPayslipColumns(payslip: Payslip): {
  income: (PayslipLineItem | null)[]
  deduction: (PayslipLineItem | null)[]
} {
  const bySortOrder = (a: PayslipLineItem, b: PayslipLineItem) => a.sortOrder - b.sortOrder
  const income = payslip.lineItems.filter((i) => i.side === 'income').sort(bySortOrder)
  const deduction = payslip.lineItems.filter((i) => i.side === 'deduction').sort(bySortOrder)

  const incomeMirrorAt = income.findIndex((i) => i.pairId !== null)
  const deductionMirrorAt = deduction.findIndex((i) => i.pairId !== null)

  const paddedIncome: (PayslipLineItem | null)[] = [...income]
  const paddedDeduction: (PayslipLineItem | null)[] = [...deduction]

  if (incomeMirrorAt >= 0 && deductionMirrorAt >= 0) {
    const gap = incomeMirrorAt - deductionMirrorAt
    if (gap > 0) paddedDeduction.splice(deductionMirrorAt, 0, ...blanks(gap))
    else if (gap < 0) paddedIncome.splice(incomeMirrorAt, 0, ...blanks(-gap))
  }

  // Whichever column is still short is padded at the end, so both render the
  // same number of rows and the totals line up.
  const height = Math.max(paddedIncome.length, paddedDeduction.length)
  paddedIncome.push(...blanks(height - paddedIncome.length))
  paddedDeduction.push(...blanks(height - paddedDeduction.length))

  return { income: paddedIncome, deduction: paddedDeduction }
}

function blanks(count: number): null[] {
  return Array.from({ length: Math.max(0, count) }, () => null)
}

/**
 * §15 — the honest figures, for anything that is not the slip itself. The
 * stored column totals are inflated by the mirror by design (§3, decision 3);
 * a cost report using them would overstate gross on every employee.
 */
export function trueGross(payslip: Payslip): number {
  return payslip.lineItems
    .filter((i) => i.side === 'income' && !i.isEmployerMirror)
    .reduce((total, i) => total + i.amount, 0)
}

export function trueDeductions(payslip: Payslip): number {
  return payslip.lineItems
    .filter((i) => i.side === 'deduction' && i.pairId === null)
    .reduce((total, i) => total + i.amount, 0)
}

/** 'YYYY-MM' → 'July 2026', for the Salary Month header field (§10). */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** SHA-256 of the uploaded file text — §4.4's duplicate-upload guard, native, no dependency. */
export async function hashFileText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
