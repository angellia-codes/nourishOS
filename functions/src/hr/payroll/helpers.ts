import { AppError } from '../../lib'

const PERIOD_MONTH_RE = /^\d{4}-\d{2}$/

export function requirePeriodMonth(raw: unknown): string {
  if (typeof raw !== 'string' || !PERIOD_MONTH_RE.test(raw)) {
    throw new AppError('invalid-argument', 'periodMonth must be in YYYY-MM format.')
  }
  return raw
}

/** Same shape as updateEmployeeCompensation.ts's identically-named helper — kept local since neither is exported for reuse elsewhere. */
export function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new AppError('invalid-argument', `${field} must be a non-negative number.`)
  }
  return value
}

/** Blank/undefined CSV cells import as 0 — only a non-blank, non-numeric value is a client/server error. */
export function optionalNonNegativeNumber(value: unknown, field: string): number {
  if (value === undefined || value === null || value === '') return 0
  return requireNonNegativeNumber(typeof value === 'string' ? Number(value) : value, field)
}
