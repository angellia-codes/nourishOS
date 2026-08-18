import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS } from '../../lib'
import { FONNTE_TOKEN } from '../../lib/secrets'

/**
 * Fonnte WhatsApp channel adapter — HR_OPERATIONS.md §13.1, sitting behind the
 * existing Notification Engine per §6.2 ("do not build a second notification
 * log"). Plain `fetch`, no SDK: the whole surface is one POST.
 *
 * Deviation from §13.1's table, deliberate: the doc writes the auth header as
 * `Authorization: Bearer {token}`, but Fonnte's actual API takes the bare
 * token with no scheme. Following the live API — the doc was written from the
 * spec, this is what the account accepts.
 *
 * Best-effort by design: every failure is logged and returned, never thrown.
 * The in-app notification is the durable record; WhatsApp is a second channel
 * on top of it, so a dead Fonnte device must not fail the caller's mutation.
 */

const FONNTE_SEND_URL = 'https://api.fonnte.com/send'
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 5_000
/** §13.1 "2-second delay between bulk messages", passed through to Fonnte. */
const BULK_DELAY_SECONDS = '2'

export interface WhatsAppResult {
  status: 'sent' | 'failed' | 'skipped'
  messageId: string | null
  attempts: number
  error: string | null
}

const SKIPPED: WhatsAppResult = { status: 'skipped', messageId: null, attempts: 0, error: null }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sends one WhatsApp message. `target` is a phone in Fonnte's format
 * (`628123456789`) — see `whatsAppTargetForUid` for where that comes from.
 */
export async function sendWhatsApp(target: string, message: string): Promise<WhatsAppResult> {
  const token = FONNTE_TOKEN.value()
  if (!token) {
    logger.warn('FONNTE_TOKEN is not set — skipping WhatsApp send. Declare secrets: [FONNTE_TOKEN] on the function.')
    return SKIPPED
  }
  if (!target) return SKIPPED

  let lastError = 'unknown error'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(FONNTE_SEND_URL, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, message, countryCode: '62', delay: BULK_DELAY_SECONDS }),
      })

      const body = (await response.json().catch(() => ({}))) as {
        status?: boolean
        reason?: string
        id?: string | string[]
      }

      if (response.ok && body.status === true) {
        const id = Array.isArray(body.id) ? body.id[0] : body.id
        return { status: 'sent', messageId: id ?? null, attempts: attempt, error: null }
      }

      // §13.1's documented failure shape: 400 { status: false, reason: "Device disconnected" }
      lastError = body.reason ?? `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS)
  }

  logger.error(`WhatsApp send to ${target} failed after ${MAX_ATTEMPTS} attempts: ${lastError}`)
  return { status: 'failed', messageId: null, attempts: MAX_ATTEMPTS, error: lastError }
}

/**
 * Resolves a system user's WhatsApp number. `users/{uid}` carries no phone —
 * the number lives on the linked employee record (§12.1's `phone`, stored in
 * the 62xxx format WhatsApp needs), so this is a two-hop read. Returns null
 * for a user with no linked employee, which is a normal state, not an error.
 */
export async function whatsAppTargetForUid(uid: string): Promise<string | null> {
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get()
  const employeeId = userSnap.data()?.employeeId as string | undefined
  if (!employeeId) return null

  const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId).get()
  const phone = employeeSnap.data()?.phone as string | undefined
  return phone ?? null
}

/**
 * §9.5's `[HR_NAME]` / `[HR_PHONE]` template variables, from `integrations/fonnte`
 * (§6.2: reuse `integrations`, do not create a CONFIG collection). Missing doc
 * is tolerated — templates render the fallbacks rather than failing a stage move.
 */
export async function hrContactDetails(): Promise<{ name: string; phone: string }> {
  const snap = await db.collection(COLLECTIONS.INTEGRATIONS).doc('fonnte').get()
  const data = snap.data() ?? {}
  return {
    name: (data.hrContactName as string | undefined) ?? 'Nourish HR',
    phone: (data.hrContactPhone as string | undefined) ?? '',
  }
}
