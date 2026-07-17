import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../../lib'
import { CLOSED_TASK_STATUSES, DAILY_UPDATE_TAG } from './helpers'

/** daily-updates.md §6. Runs at 00:01 — increments daysOpen on every open dailyUpdate task, same doc, no duplicate rows. */
export const carryForwardDailyTasks = onSchedule({ schedule: '1 0 * * *', region: REGION }, async () => {
  const tasksSnap = await db.collection(COLLECTIONS.TASKS).where('tags', 'array-contains', DAILY_UPDATE_TAG).get()

  for (const doc of tasksSnap.docs) {
    const task = doc.data()
    if (CLOSED_TASK_STATUSES.includes(task.taskStatus)) continue

    try {
      const daysOpen = (task.daysOpen as number | undefined) ?? 0
      await doc.ref.update({ daysOpen: daysOpen + 1 })
    } catch (error) {
      logger.error(`Failed to carry forward daily update task ${doc.id}`, error)
    }
  }
})
