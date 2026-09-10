/**
 * Currency formatting. IDR only for now — DATABASE.md §14 hardcodes
 * "currency": "IDR" on expense requests; multi-currency isn't in scope
 * until Purchasing/Finance need cross-border suppliers.
 */
export function formatCurrency(amount: number, currency: 'IDR' = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * "Rp 1,2 M" rather than "Rp 1.200.000.000" — for chart axes, where a payroll
 * or revenue figure at full width doesn't fit under a tick. Tooltips and tables
 * keep formatCurrency; a rounded figure is a label, not a number to work from.
 */
export function formatCompactCurrency(amount: number, currency: 'IDR' = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

/** Plain grouped number, no currency symbol — for form inputs showing a running total. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}
