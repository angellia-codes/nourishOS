import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE } from '../../lib'
import { GOOGLE_CALENDAR_SA_KEY } from '../../lib/secrets'
import { pushEventToGoogle } from './googleSync'

/**
 * HR_OPERATIONS.md §9.3-F07 — the every-15-minutes sync run.
 *
 * `createCalendarEvent` already pushes inline so a confirmed event reaches
 * Google inside §9.3-F02's 30-second target; this sweep is the retry path for
 * everything that push missed — a Google outage, a token blip, an event
 * confirmed later by GM approval rather than at creation time.
 *
 * `syncStatus` is the queue: 'pending' (never pushed) and 'failed' (pushed and
 * rejected) both get picked up, 'synced' and 'skipped' are left alone. That
 * makes the job idempotent with no cursor to keep.
 */
const RETRYABLE_STATUSES = ['pending', 'failed']
const BATCH_LIMIT = 50

export const syncCalendarEvents = onSchedule(
  { schedule: '*/15 * * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [GOOGLE_CALENDAR_SA_KEY] },
  async () => {
    const snap = await db
      .collection(COLLECTIONS.CALENDAR_EVENTS)
      .where('syncStatus', 'in', RETRYABLE_STATUSES)
      // ponytail: oldest-50-per-run, no cursor. At one event per push and a run
      // every 15 minutes this clears any realistic backlog; swap for a cursor
      // if the calendar ever bulk-imports thousands of events at once.
      .limit(BATCH_LIMIT)
      .get()

    for (const doc of snap.docs) {
      try {
        await pushEventToGoogle(doc.id)
      } catch (error) {
        // pushEventToGoogle already records the failure on the doc; this only
        // stops one bad event ending the whole run.
        logger.error(`Calendar sync sweep failed for ${doc.id}`, error)
      }
    }
  },
)
