import { db, COLLECTIONS, AppError, addDaysIso, todayIso } from '../../lib'

/**
 * Input hygiene for the public half of the portal. These callables take no
 * authenticated user, so everything they accept is hostile until proven
 * otherwise: sizes are capped here rather than trusted from the client.
 *
 * ponytail: no App Check yet — turn on App Check + reCAPTCHA Enterprise before
 * careers.nourishgroup.id is announced publicly. Until then the duplicate
 * window below is the only rate limit, and it only stops the honest kind of
 * double-submit.
 */

/** Roughly the callable payload ceiling once base64 overhead is counted. */
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024

const DUPLICATE_WINDOW_DAYS = 30

export function requirePayloadUnderLimit(data: unknown): void {
  const payload = (data ?? {}) as Record<string, unknown>

  // The file body is checked on its own and then excluded from the stringify:
  // serialising an oversized upload just to measure it would allocate the very
  // megabytes this guard exists to refuse.
  const body = typeof payload.contentBase64 === 'string' ? payload.contentBase64 : ''
  if (body.length * 0.75 > MAX_PAYLOAD_BYTES) {
    throw new AppError('invalid-argument', 'That upload is too large. Files must be under 8MB.')
  }

  const size = Buffer.byteLength(JSON.stringify({ ...payload, contentBase64: undefined }), 'utf8')
  if (size > MAX_PAYLOAD_BYTES) {
    throw new AppError('invalid-argument', 'That request is too large.')
  }
}

/**
 * Same canonicalisation candidates.ts uses for HR's duplicate check — 0811…,
 * +62811… and 62811… are one line, and an applicant who applies twice with
 * two spellings of their own number is not two applicants.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    throw new AppError('invalid-argument', 'Enter a valid email address.')
  }
  if (trimmed.length > 200) {
    throw new AppError('invalid-argument', 'That email address is too long.')
  }
  return trimmed
}

/**
 * Refuses a second application for the same vacancy from the same phone
 * inside the window. HR's own `createCandidate` allows an explicit override
 * (`allowDuplicate`); the portal has no such escape hatch on purpose — an
 * unauthenticated caller must not be able to opt out of the check.
 */
export async function requireNotDuplicate(phoneDigits: string, requisitionId: string): Promise<void> {
  const since = addDaysIso(-DUPLICATE_WINDOW_DAYS)
  const existing = await db
    .collection(COLLECTIONS.CANDIDATES)
    .where('phoneDigits', '==', phoneDigits)
    .where('requisitionId', '==', requisitionId)
    .where('applicationDate', '>=', since)
    .limit(1)
    .get()

  if (!existing.empty) {
    throw new AppError(
      'already-exists',
      'You have already applied for this position. Check your WhatsApp for the link to your application.',
    )
  }
}

/** Trimmed, length-capped free text — the portal's answer to `requireText`. */
export function portalText(value: unknown, label: string, maxLength: number, required = true): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    if (required) throw new AppError('invalid-argument', `${label} is required.`)
    return ''
  }
  if (text.length > maxLength) {
    throw new AppError('invalid-argument', `${label} must be ${maxLength} characters or fewer.`)
  }
  return text
}

/** ISO date (YYYY-MM-DD), rejected if in the future when `pastOnly`. */
export function portalIsoDate(value: unknown, label: string, pastOnly = false): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new AppError('invalid-argument', `${label} must be a valid date.`)
  }
  if (pastOnly && text > todayIso()) {
    throw new AppError('invalid-argument', `${label} cannot be in the future.`)
  }
  return text
}
