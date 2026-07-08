const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9\s-]{8,15}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim())
}

export function isRequired(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined
}

export function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/** Per finance.md §19: "Expense date cannot be in the future." Generic enough to reuse elsewhere. */
export function isNotFutureDate(value: Date): boolean {
  return value.getTime() <= Date.now()
}
