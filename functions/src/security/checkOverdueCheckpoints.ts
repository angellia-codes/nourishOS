import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../lib'
import { notifyUsersByRole } from '../shared/notifications'

const DEFAULT_INTERVAL_MINUTES = 120

/**
 * Runs every 15 minutes. For each active checkpoint, alerts a supervisor
 * if it's gone longer than its scheduleIntervalMinutes without a visit —
 * but only once per missed interval (lastAlertedAt cooldown), not once
 * every 15-minute tick, or a badly overdue checkpoint would spam alerts.
 *
 * NOTE: requires the Firebase project to be on the Blaze plan — Cloud
 * Scheduler (which onSchedule provisions automatically on deploy) isn't
 * available on the free Spark plan. Flagging since it's a real deployment
 * prerequisite, not obvious from the code.
 */
export const checkOverdueCheckpoints = onSchedule({ schedule: 'every 15 minutes', region: REGION }, async () => {
  const checkpointsSnap = await db.collection(COLLECTIONS.CHECKPOINTS).where('isArchived', '==', false).get()

  const now = Date.now()

  for (const doc of checkpointsSnap.docs) {
    const checkpoint = doc.data()
    const intervalMs = (checkpoint.scheduleIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES) * 60 * 1000

    const lastVisitedMs: number = checkpoint.lastVisitedAt?.toMillis?.() ?? doc.createTime?.toMillis() ?? 0
    const isOverdue = now - lastVisitedMs > intervalMs
    if (!isOverdue) continue

    const lastAlertedMs: number = checkpoint.lastAlertedAt?.toMillis?.() ?? 0
    const alertedWithinCurrentInterval = now - lastAlertedMs < intervalMs
    if (alertedWithinCurrentInterval) continue

    try {
      await notifyUsersByRole({
        role: 'generalManager',
        module: 'security',
        title: 'Checkpoint Overdue',
        message: `"${checkpoint.name}" has not been patrolled in over ${
          checkpoint.scheduleIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES
        } minutes.`,
        referenceId: doc.id,
        priority: 'high',
      })

      await doc.ref.update({ lastAlertedAt: FieldValue.serverTimestamp() })
    } catch (error) {
      logger.error(`Failed to send overdue alert for checkpoint ${doc.id}`, error)
    }
  }
})
