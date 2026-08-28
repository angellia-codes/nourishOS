import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE, todayIso } from '../../lib'
import { createTaskInternal } from '../../shared/tasks'

const SYSTEM_ACTOR = 'system'

/** The month that just closed, as 'YYYY-MM', computed from today (WITA) — this job runs on the 1st. */
function lastClosedPeriod(): string {
  const [year, month] = todayIso().split('-').map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

/**
 * attendance.md §9 Task Engine row — "Import attendance for {month}", assigned
 * to HR Manager, generated on the 1st. Mirrors
 * functions/src/security/fireExtinguishers/generateMonthlyAparRounds.ts's
 * declaration and referenceId-dedup shape.
 */
export const remindAttendanceImport = onSchedule(
  { schedule: '0 6 1 * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const period = lastClosedPeriod()
    const referenceId = `attendance-import-${period}`

    const existing = await db.collection(COLLECTIONS.TASKS).where('referenceId', '==', referenceId).limit(1).get()
    if (!existing.empty) return

    const hrManagersSnap = await db
      .collection(COLLECTIONS.USERS)
      .where('roleId', '==', 'hrManager')
      .where('status', '==', 'active')
      .get()
    if (hrManagersSnap.empty) {
      logger.warn(`No active HR Manager to assign the ${period} attendance import reminder to.`)
      return
    }

    await createTaskInternal({
      title: `Import attendance for ${period}`,
      description: 'Upload the month\'s attendance recap CSV and route it through approval.',
      taskType: 'reminder',
      sourceModule: 'hr',
      referenceId,
      assignedTo: hrManagersSnap.docs.map((doc) => doc.id),
      assignedBy: SYSTEM_ACTOR,
      priority: 'medium',
    })
  },
)
