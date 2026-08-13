import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION } from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import { todayIso } from './helpers'

const LEADER_ROLES = ['kitchenLeader', 'barLeader', 'floorLeader', 'bakeryLeader', 'wholefoodLeader', 'outletManager']

/**
 * daily-updates.md §6, M17-F11. No "active outlet/department" master list
 * exists in this codebase yet (the demo's ACTIVE_OUTLET_DEPARTMENTS is just
 * a hardcoded display number) — so this checks per active leader/outlet
 * manager whether their own outlet+department submitted today, rather than
 * enumerating a config collection that doesn't exist. Runs at 17:00.
 */
export const sendComplianceAlerts = onSchedule({ schedule: '0 17 * * *', region: REGION }, async () => {
  const today = todayIso()
  const leadersSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', 'in', LEADER_ROLES)
    .where('status', '==', 'active')
    .get()

  const seenOutletDepartments = new Set<string>()

  for (const leaderDoc of leadersSnap.docs) {
    const leader = leaderDoc.data()
    const outletId = leader.outletId as string | undefined
    const departmentId = leader.departmentId as string | undefined
    if (!outletId || !departmentId) continue

    const key = `${outletId}::${departmentId}`
    if (seenOutletDepartments.has(key)) continue
    seenOutletDepartments.add(key)

    try {
      const reportSnap = await db
        .collection(COLLECTIONS.DAILY_REPORTS)
        .where('outletId', '==', outletId)
        .where('departmentId', '==', departmentId)
        .where('date', '==', today)
        .limit(1)
        .get()
      if (!reportSnap.empty) continue

      await sendNotificationInternal({
        type: 'alert',
        title: 'Daily Update Not Submitted',
        message: `No daily update submitted today for this department.`,
        module: 'operations',
        priority: 'high',
        recipientUid: leaderDoc.id,
      })
    } catch (error) {
      logger.error(`Failed to check daily update compliance for ${key}`, error)
    }
  }
})
