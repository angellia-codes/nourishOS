import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'

const WARNING_WINDOW_DAYS = 7

/**
 * Runs daily. Flags items within 7 days of (or past) retentionExpiresAt for
 * Outlet Manager — mirrors checkOverdueCheckpoints' cooldown pattern:
 * `retentionWarnedAt` guards against re-notifying every run.
 *
 * ponytail: the spec (lost-and-found-report.md §8) wants two distinct
 * notices — one at 7-days-out, one once actually past due. Collapsed to a
 * single fire-once-per-item notice (still satisfies AC-6: "not repeated
 * daily") since a guest checking back in that narrow window is rare enough
 * not to warrant a second cooldown field. Upgrade path: add a second
 * `retentionExpiredWarnedAt` field if the single-notice version proves too
 * quiet in practice.
 */
export const checkLostFoundRetention = onSchedule({ schedule: 'every day 09:00', region: REGION }, async () => {
  const itemsSnap = await db
    .collection(COLLECTIONS.LOST_FOUND_ITEMS)
    .where('status', 'in', ['logged', 'unclaimed'])
    .get()

  const today = new Date().toISOString().slice(0, 10)
  const warningThreshold = new Date()
  warningThreshold.setUTCDate(warningThreshold.getUTCDate() + WARNING_WINDOW_DAYS)
  const warningThresholdIso = warningThreshold.toISOString().slice(0, 10)

  for (const doc of itemsSnap.docs) {
    const item = doc.data()
    const nearingOrPastRetention = item.retentionExpiresAt <= warningThresholdIso
    if (!nearingOrPastRetention || item.retentionWarnedAt) continue

    try {
      const pastDue = item.retentionExpiresAt <= today

      await notifyUsersByRole({
        role: 'outletManager',
        module: 'operations',
        title: pastDue ? 'Lost & Found Item Past Retention' : 'Lost & Found Item Nearing Disposal',
        message: `"${item.itemDescription}" (${item.itemNumber}) ${
          pastDue ? 'is past its retention hold' : `must be claimed by ${item.retentionExpiresAt}`
        } — decide unclaimed → disposed/donated/handedToAuthorities.`,
        referenceId: doc.id,
        priority: pastDue ? 'high' : 'medium',
      })

      const updates: Record<string, unknown> = { retentionWarnedAt: FieldValue.serverTimestamp() }
      if (pastDue && item.status === 'logged') updates.status = 'unclaimed'
      await doc.ref.update(updates)
    } catch (error) {
      logger.error(`Failed to send retention alert for lost & found item ${doc.id}`, error)
    }
  }
})
