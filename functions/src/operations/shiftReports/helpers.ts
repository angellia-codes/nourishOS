import { AppError } from '../../lib'

/**
 * opening_closing_shift_report_template.md — the report is ~30 fields of
 * free text, counts and "None / Yes + details" pairs. Rather than validating
 * each one inline in the callable, the shapes are coerced here: the client
 * cannot make the document malformed, only wrong, and the callable stays
 * readable.
 */

export type ShiftReportType = 'opening' | 'closing'
export type UnavailableCategory = 'food' | 'cakeGelato' | 'beverage'

export interface ShiftReportIssue {
  present: boolean
  details: string
}

export interface UnavailableItem {
  category: UnavailableCategory
  product: string
  reason: string
  actionRequired: string
}

export interface LimitedItem {
  product: string
  remainingQty: number
  actionRequired: string
}

export interface DeptStaffing {
  pic: string
  regularStaff: number
  dailyWorker: number
  midShift: number
}

const UNAVAILABLE_CATEGORIES: readonly UnavailableCategory[] = ['food', 'cakeGelato', 'beverage']

/** Free text, trimmed and length-capped so one paste can't bloat the document. */
export function text(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** A headcount. Negative, fractional and non-numeric all collapse to 0 rather than throwing — these are tally boxes on a paper form. */
export function count(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** An optional numeric field that stays null when the manager left it blank — distinct from a real 0. */
export function optionalNumber(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(n, max)
}

/** One "- [ ] None / - [ ] Yes — Details:" pair. Details are dropped when nothing is flagged, so a stale note can't survive a "None". */
export function issue(value: unknown): ShiftReportIssue {
  const raw = (value ?? {}) as Partial<ShiftReportIssue>
  const present = raw.present === true
  return { present, details: present ? text(raw.details) : '' }
}

export function staffing(value: unknown): DeptStaffing {
  const raw = (value ?? {}) as Partial<DeptStaffing>
  return {
    pic: text(raw.pic, 120),
    regularStaff: count(raw.regularStaff),
    dailyWorker: count(raw.dailyWorker),
    midShift: count(raw.midShift),
  }
}

/** Rows the manager started but never filled in are dropped rather than stored blank. */
export function unavailableItems(value: unknown): UnavailableItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      const raw = (row ?? {}) as Partial<UnavailableItem>
      return {
        category: UNAVAILABLE_CATEGORIES.includes(raw.category as UnavailableCategory)
          ? (raw.category as UnavailableCategory)
          : 'food',
        product: text(raw.product, 200),
        reason: text(raw.reason, 500),
        actionRequired: text(raw.actionRequired, 500),
      }
    })
    .filter((row) => row.product !== '')
}

export function limitedItems(value: unknown): LimitedItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      const raw = (row ?? {}) as Partial<LimitedItem>
      return {
        product: text(raw.product, 200),
        remainingQty: count(raw.remainingQty),
        actionRequired: text(raw.actionRequired, 500),
      }
    })
    .filter((row) => row.product !== '')
}

/**
 * §7/§8 ask for three numbered priorities; extras are cut rather than rejected.
 * The cap is applied BEFORE blanks are dropped — the slots are positional, so a
 * fourth entry must not slide up into a blank third slot.
 */
export function priorities(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 3)
    .map((entry) => text(entry, 500))
    .filter((entry) => entry !== '')
}

/**
 * The absorbed checklist section. Every key must be a known item id for this
 * report type — an unknown id means the client and the code table have
 * drifted, which is worth a hard error rather than a silently dropped tick.
 */
export function checklistStatuses(value: unknown, knownIds: Set<string>): Record<string, boolean> {
  const raw = (value ?? {}) as Record<string, unknown>
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError('invalid-argument', 'checklistStatuses must be an object.')
  }
  const result: Record<string, boolean> = {}
  for (const [id, done] of Object.entries(raw)) {
    if (!knownIds.has(id)) {
      throw new AppError('invalid-argument', `Unknown checklist item "${id}".`)
    }
    result[id] = done === true
  }
  return result
}
