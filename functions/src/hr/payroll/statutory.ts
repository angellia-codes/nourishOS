import { STATUTORY_COMPONENTS, type StatutoryComponent } from '../../lib/payroll'

/**
 * Statutory recompute and line-item expansion —
 * payroll-components-payslip-design.md §3/§4.1/§4.5.
 *
 * Pure: no Firestore, no auth, no clock. Everything here is pinned by
 * functions/test/payroll-statutory.mjs against §3's verified July-2026 slip.
 */

/** §4.2, narrowed to what the recompute actually reads. */
export interface StatutoryRates {
  jkk: number
  jkm: number
  jhtCompany: number
  jhtEmployee: number
  jpCompany: number
  jpEmployee: number
  bpjsKesCo: number
  bpjsKesEmp: number
  bpjsKesFam: number
  jpWageCeiling: number
  bpjsKesCeiling: number
}

export interface StatutoryAmount {
  componentId: string
  amount: number
  rate: number
  base: number
}

/**
 * §3 — the three bases. Jaminan Pensiun uses a statutory wage ceiling, NOT
 * basic salary: 221,726 / 0.02 = 11,086,300, which is the 2026 ceiling rather
 * than the employee's 18,500,000 basic. Getting this wrong is the single
 * highest-value error this module exists to catch.
 */
export function resolveBase(baseKey: string, basicSalary: number, rates: StatutoryRates): number {
  switch (baseKey) {
    case 'basicSalary':
      return basicSalary
    case 'jpCappedBase':
      return Math.min(basicSalary, rates.jpWageCeiling)
    case 'bpjsKesBase':
      return Math.min(basicSalary, rates.bpjsKesCeiling)
    default:
      throw new Error(`Unknown statutory base key: ${baseKey}`)
  }
}

/**
 * §6.4 — the nine recomputable components (everything except PPh 21, which has
 * no rate or base until a tax engine exists). Rounded to whole rupiah; the
 * Rp 100 tolerance in validate.ts absorbs the difference against a source that
 * rounds differently.
 */
export function recomputeStatutory(rates: StatutoryRates, basicSalary: number): StatutoryAmount[] {
  const results: StatutoryAmount[] = []
  for (const [componentId, component] of Object.entries(STATUTORY_COMPONENTS)) {
    if (component.rateKey === null || component.baseKey === null) continue
    const rate = rates[component.rateKey as keyof StatutoryRates] as number
    const base = resolveBase(component.baseKey, basicSalary, rates)
    results.push({ componentId, rate, base, amount: Math.round(rate * base) })
  }
  return results
}

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
  rates: StatutoryRates | null,
  basicSalary: number,
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
    const { rate, base } = describeStatutory(component, rates, basicSalary)

    if (component.side === 'both') {
      // §3's mirror pair — identical amount on both sides, netting to zero.
      items.push({
        componentId,
        labelId: component.label,
        labelEn: component.label,
        side: 'income',
        amount,
        rate,
        base,
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
        rate,
        base,
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
      rate,
      base,
      isEmployerMirror: false,
      pairId: null,
      sortOrder: component.sortOrder,
    })
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

function describeStatutory(
  component: StatutoryComponent,
  rates: StatutoryRates | null,
  basicSalary: number,
): { rate: number | null; base: number | null } {
  if (!rates || component.rateKey === null || component.baseKey === null) {
    return { rate: null, base: null }
  }
  return {
    rate: rates[component.rateKey as keyof StatutoryRates] as number,
    base: resolveBase(component.baseKey, basicSalary, rates),
  }
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
