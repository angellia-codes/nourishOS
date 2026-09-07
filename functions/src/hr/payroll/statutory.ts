import { STATUTORY_COMPONENTS } from '../../lib/payroll'

/**
 * Line-item expansion —
 * payroll-components-payslip-design.md §3/§4.1/§4.5.
 *
 * Pure: no Firestore, no auth, no clock. Everything here is pinned by
 * functions/test/payroll-statutory.mjs against §3's verified July-2026 slip.
 */

/**
 * Every statutory figure is entered by hand and taken as supplied — there is
 * no rate table and no recompute (see validate.ts). `rate` and `base` stay
 * null on the resulting line items for the same reason: nothing in this app
 * knows the rate a given figure was struck at.
 */
export interface LineItem {
  componentId: string
  labelId: string
  labelEn: string
  side: 'income' | 'deduction'
  amount: number
  rate: number | null
  base: number | null
  isEmployerMirror: boolean
  pairId: string | null
  sortOrder: number
}

export interface DiscretionaryInput {
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  amount: number
}

/** Per-component amounts read off one CSV row, keyed by component id. */
export type StatutoryAmountsByComponent = Record<string, number>

/**
 * §4.5/§5 — builds the full line-item array for one payslip.
 *
 * A `side: 'both'` component is emitted TWICE from a single CSV value: one
 * income row flagged `isEmployerMirror`, one deduction row, sharing a pairId.
 * Both carry the same sortOrder so the renderer can align the mirror blocks
 * horizontally (decision 11). The CSV supplies each mirror once — supplying it
 * twice would invite the two halves to diverge.
 */
export function expandLineItems(
  discretionary: DiscretionaryInput[],
  statutoryAmounts: StatutoryAmountsByComponent,
): LineItem[] {
  const items: LineItem[] = []

  for (const component of discretionary) {
    items.push({
      componentId: component.code,
      labelId: component.labelId,
      labelEn: component.labelEn,
      side: component.type === 'earning' ? 'income' : 'deduction',
      amount: component.amount,
      rate: null,
      base: null,
      isEmployerMirror: false,
      pairId: null,
      sortOrder: component.sortOrder,
    })
  }

  for (const [componentId, component] of Object.entries(STATUTORY_COMPONENTS)) {
    const amount = statutoryAmounts[componentId] ?? 0

    if (component.side === 'both') {
      // §3's mirror pair — identical amount on both sides, netting to zero.
      items.push({
        componentId,
        labelId: component.label,
        labelEn: component.label,
        side: 'income',
        amount,
        rate: null,
        base: null,
        isEmployerMirror: true,
        pairId: component.pairId ?? null,
        sortOrder: component.sortOrder,
      })
      items.push({
        componentId,
        labelId: component.label,
        labelEn: component.label,
        side: 'deduction',
        amount,
        rate: null,
        base: null,
        isEmployerMirror: false,
        pairId: component.pairId ?? null,
        sortOrder: component.sortOrder,
      })
      continue
    }

    items.push({
      componentId,
      labelId: component.label,
      labelEn: component.label,
      side: component.side === 'income' ? 'income' : 'deduction',
      amount,
      rate: null,
      base: null,
      isEmployerMirror: false,
      pairId: null,
      sortOrder: component.sortOrder,
    })
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

/** §4.4 — column totals INCLUDE the mirror, exactly as the source Excel does. */
export function sumSide(items: LineItem[], side: 'income' | 'deduction'): number {
  return items.filter((i) => i.side === side).reduce((total, i) => total + i.amount, 0)
}

/**
 * §15 — the employer's own contribution cost: the mirror income lines only.
 * Any consumer wanting honest gross filters `isEmployerMirror === false`.
 */
export function sumEmployerCost(items: LineItem[]): number {
  return items.filter((i) => i.isEmployerMirror).reduce((total, i) => total + i.amount, 0)
}
