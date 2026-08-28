import { db, COLLECTIONS, AppError } from '../../lib'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Validates a 'YYYY-MM-DD' civil-date string — same contract as recruitment/helpers.ts. */
export function requireIsoDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AppError('invalid-argument', `${fieldName} must be a valid YYYY-MM-DD date.`)
  }
  return value
}

/** Trims, enforces presence and a max length. Returns the trimmed value. */
export function requireText(value: unknown, fieldName: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new AppError('invalid-argument', `${fieldName} is required.`)
  }
  if (text.length > maxLength) {
    throw new AppError('invalid-argument', `${fieldName} must be ${maxLength} characters or fewer.`)
  }
  return text
}

/** Trims, returns null when empty — for optional text fields. */
export function optionalText(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  const text = requireText(value, fieldName, maxLength)
  return text
}

/** Rupiah has no minor unit in practice — same reasoning expenseRequests' helpers use. */
export function validateCost(value: unknown): number {
  const cost = Number(value)
  if (!Number.isFinite(cost) || cost < 0) {
    throw new AppError('invalid-argument', 'cost must be a non-negative number.')
  }
  return Math.round(cost)
}

/** Deduped, non-empty employeeIds, each checked against a real employees doc. */
export async function validateParticipantIds(value: unknown): Promise<string[]> {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string' && id.trim())) {
    throw new AppError('invalid-argument', 'participantEmployeeIds must be a list of employee ids.')
  }
  const ids = [...new Set(value.map((id) => (id as string).trim()))]
  const snaps = await Promise.all(ids.map((id) => db.collection(COLLECTIONS.EMPLOYEES).doc(id).get()))
  const missing = snaps.filter((snap) => !snap.exists).map((snap) => snap.id)
  if (missing.length > 0) {
    throw new AppError('invalid-argument', `Unknown employee id(s): ${missing.join(', ')}.`)
  }
  return ids
}
