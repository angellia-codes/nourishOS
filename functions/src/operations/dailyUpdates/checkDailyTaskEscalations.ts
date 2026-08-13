import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { CLOSED_TASK_STATUSES, DAILY_UPDATE_TAG, ESCALATION_THRESHOLDS } from './helpers'

/** daily-updates.md §5/§6. Runs at 07:00, after carryForwardDailyTasks. Idempotent via escalationLevel — only escalates when daysOpen crosses a threshold AND escalationLevel is still below it. */
export const checkDailyTaskEscalations = onSchedule({ schedule: '0 7 * * *', region: REGION }, async () => {
  const tasksSnap = await db.collection(COLLECTIONS.TASKS).where('tags', 'array-contains', DAILY_UPDATE_TAG).get()

  for (const doc of tasksSnap.docs) {
    const task = doc.data()
    if (CLOSED_TASK_STATUSES.includes(task.taskStatus)) continue

    const daysOpen = (task.daysOpen as number | undefined) ?? 0
    const currentLevel = (task.escalationLevel as number | undefined) ?? 0

    const nextThreshold = ESCALATION_THRESHOLDS.find((t) => daysOpen >= t.daysOpen && t.level > currentLevel)
    if (!nextThreshold) continue

    try {
      await notifyUsersByRole({
        role: nextThreshold.role,
        module: 'operations',
        title: `Daily Update Task Escalation — Level ${nextThreshold.level}`,
        message: `"${task.title}" has been open ${daysOpen} day(s) with no resolution.`,
        referenceId: doc.id,
        priority: nextThreshold.level >= 3 ? 'critical' : 'high',
      })
      await doc.ref.update({ escalationLevel: nextThreshold.level })
    } catch (error) {
      logger.error(`Failed to escalate daily update task ${doc.id}`, error)
    }
  }
})
