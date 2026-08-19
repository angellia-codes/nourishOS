import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { OPEN_WORK_ORDER_STATUSES, WORK_ORDER_ESCALATIONS } from './helpers'

/**
 * FEATURE_SPECIFICATIONS.md Module 5 escalation: a work order still open after
 * 1 day escalates to engineering, after 3 days to the GM. Runs at 07:15, just
 * after the daily-updates sweep, and is idempotent the same way that one is —
 * escalationLevel on the document only ever moves up, so a re-run (or a second
 * day at the same level) sends nothing.
 */
export const checkWorkOrderEscalations = onSchedule(
  { schedule: '15 7 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [FONNTE_TOKEN] },
  async () => {
    const snap = await db.collection(COLLECTIONS.WORK_ORDERS).where('status', 'in', OPEN_WORK_ORDER_STATUSES).get()

    const now = Date.now()
    for (const doc of snap.docs) {
      const workOrder = doc.data()
      const createdAt = workOrder.createdAt?.toDate?.() as Date | undefined
      if (!createdAt) continue

      const daysOpen = Math.floor((now - createdAt.getTime()) / 86_400_000)
      const currentLevel = (workOrder.escalationLevel as number | undefined) ?? 0

      // Highest threshold already crossed, so a work order left alone for a
      // week does not walk the ladder one rung per day.
      const threshold = [...WORK_ORDER_ESCALATIONS]
        .reverse()
        .find((t) => daysOpen >= t.daysOpen && t.level > currentLevel)
      if (!threshold) continue

      try {
        await notifyUsersByRole({
          role: threshold.role,
          module: 'operations',
          title: `Work Order Escalation — Level ${threshold.level}`,
          message: `"${workOrder.title}" at ${workOrder.location} has been open ${daysOpen} day(s) and is still ${workOrder.status}.`,
          referenceId: doc.id,
          priority: threshold.level >= 2 ? 'critical' : 'high',
          whatsapp: true,
        })
        await doc.ref.update({ escalationLevel: threshold.level })
      } catch (error) {
        logger.error(`Failed to escalate work order ${doc.id}`, error)
      }
    }
  },
)
