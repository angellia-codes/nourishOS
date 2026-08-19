import { logger } from 'firebase-functions/v2'
import { JWT } from 'google-auth-library'
import { Timestamp } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { GOOGLE_CALENDAR_SA_KEY } from '../../lib/secrets'

/**
 * Google Calendar sync — HR_OPERATIONS.md §9.3 and §14.4.
 *
 * Calls the Calendar REST API directly (`events.insert` / `patch` / `delete` /
 * `freeBusy`) with a service-account JWT, per §13.2's own correction that the
 * Apps Script `CalendarApp` object in the v1.0.0 draft is not callable from a
 * Cloud Function. **No `googleapis` package**: that dependency is enormous and
 * the surface used here is four endpoints, so `google-auth-library` (already
 * present as a firebase-admin transitive, now a direct dep) mints the token and
 * plain `fetch` does the rest.
 *
 * Every function here is best-effort and never throws to its caller: a Google
 * outage must not fail the mutation that scheduled the meeting. Failures land
 * on the event as `syncStatus: 'failed'` + `syncError`, and the 15-minute sweep
 * (§9.3-F07) retries anything not `synced`.
 */

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const SCOPES = ['https://www.googleapis.com/auth/calendar']

interface CalendarConfig {
  calendarId: string
  client: JWT
}

/**
 * Null when the integration isn't provisioned — a missing secret or a missing
 * `integrations/googleCalendar` doc is a "not configured" state, not an error,
 * so the app keeps working exactly as it did before sync existed.
 */
async function calendarConfig(): Promise<CalendarConfig | null> {
  const rawKey = GOOGLE_CALENDAR_SA_KEY.value()
  if (!rawKey) return null

  const snap = await db.collection(COLLECTIONS.INTEGRATIONS).doc('googleCalendar').get()
  const calendarId = snap.data()?.calendarId as string | undefined
  if (!calendarId) return null

  try {
    const key = JSON.parse(rawKey) as { client_email: string; private_key: string }
    const client = new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES })
    return { calendarId, client }
  } catch (error) {
    logger.error('GOOGLE_CALENDAR_SA_KEY is not valid service-account JSON', error)
    return null
  }
}

async function callCalendar(
  config: CalendarConfig,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const { token } = await config.client.getAccessToken()
  const response = await fetch(`${CALENDAR_API}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: response.ok, status: response.status, body }
}

/** Firestore doc → Google event resource. */
function toGoogleEvent(event: FirebaseFirestore.DocumentData): Record<string, unknown> {
  return {
    summary: event.title as string,
    description: (event.description as string | null) ?? undefined,
    location: (event.location as string | null) ?? undefined,
    start: { dateTime: (event.startAt as Timestamp).toDate().toISOString() },
    end: { dateTime: (event.endAt as Timestamp).toDate().toISOString() },
    status: event.eventStatus === 'cancelled' ? 'cancelled' : 'confirmed',
  }
}

/**
 * §14.4's dedup rule, literally: patch when a `gcalEventId` is already stored
 * and still resolves, insert otherwise. A 404 on patch means the event was
 * deleted in Google directly — fall through to a fresh insert rather than
 * leaving the row stuck failing forever.
 */
export async function pushEventToGoogle(eventId: string): Promise<void> {
  const config = await calendarConfig()
  if (!config) return

  const ref = db.collection(COLLECTIONS.CALENDAR_EVENTS).doc(eventId)
  const snap = await ref.get()
  if (!snap.exists) return
  const event = snap.data()!

  // A company event awaiting GM approval isn't a commitment yet (§9.2-F10).
  if (event.eventStatus === 'pendingApproval') return

  try {
    const existingId = event.gcalEventId as string | null
    const payload = toGoogleEvent(event)

    let result = existingId
      ? await callCalendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events/${existingId}`, {
          method: 'PATCH',
          body: payload,
        })
      : await callCalendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events`, {
          method: 'POST',
          body: payload,
        })

    if (!result.ok && existingId && result.status === 404) {
      result = await callCalendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events`, {
        method: 'POST',
        body: payload,
      })
    }

    if (!result.ok) {
      await ref.update({ syncStatus: 'failed', syncError: `HTTP ${result.status}`, lastSyncedAt: Timestamp.now() })
      return
    }

    await ref.update({
      gcalEventId: (result.body.id as string | undefined) ?? existingId ?? null,
      syncStatus: 'synced',
      syncError: null,
      lastSyncedAt: Timestamp.now(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Google Calendar push failed for event ${eventId}: ${message}`)
    await ref.update({ syncStatus: 'failed', syncError: message, lastSyncedAt: Timestamp.now() })
  }
}

/** §9.3-F06 — the remote event goes when the system event is cancelled. */
export async function deleteEventFromGoogle(eventId: string): Promise<void> {
  const config = await calendarConfig()
  if (!config) return

  const ref = db.collection(COLLECTIONS.CALENDAR_EVENTS).doc(eventId)
  const gcalEventId = (await ref.get()).data()?.gcalEventId as string | null | undefined
  if (!gcalEventId) return

  try {
    const result = await callCalendar(
      config,
      `/calendars/${encodeURIComponent(config.calendarId)}/events/${gcalEventId}`,
      { method: 'DELETE' },
    )
    // 410 Gone means someone already deleted it there — the desired end state.
    if (result.ok || result.status === 404 || result.status === 410) {
      await ref.update({ gcalEventId: null, syncStatus: 'synced', syncError: null, lastSyncedAt: Timestamp.now() })
    } else {
      await ref.update({ syncStatus: 'failed', syncError: `HTTP ${result.status}`, lastSyncedAt: Timestamp.now() })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Google Calendar delete failed for event ${eventId}: ${message}`)
    await ref.update({ syncStatus: 'failed', syncError: message, lastSyncedAt: Timestamp.now() })
  }
}

/**
 * §9.3-F03 — busy intervals for the shared calendar over a window, used to
 * warn about a clash with something booked in Google but not in NourishOS.
 * Returns [] when unconfigured or on any failure: the in-app conflict check
 * (`findConflicts`) is the authoritative one, this only widens it.
 */
export async function busyIntervalsFromGoogle(startAt: Date, endAt: Date): Promise<{ start: string; end: string }[]> {
  const config = await calendarConfig()
  if (!config) return []

  try {
    const result = await callCalendar(config, '/freeBusy', {
      method: 'POST',
      body: { timeMin: startAt.toISOString(), timeMax: endAt.toISOString(), items: [{ id: config.calendarId }] },
    })
    if (!result.ok) return []

    const calendars = result.body.calendars as Record<string, { busy?: { start: string; end: string }[] }> | undefined
    return calendars?.[config.calendarId]?.busy ?? []
  } catch (error) {
    logger.warn('Google Calendar freeBusy check failed — falling back to the in-app conflict check only', error)
    return []
  }
}
