import { onSchedule } from 'firebase-functions/v2/scheduler'
import { db, COLLECTIONS, REGION } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { CLOSED_TASK_STATUSES, DAILY_UPDATE_TAG, todayIso } from './helpers'

const LEADER_ROLES = ['kitchenLeader', 'barLeader', 'floorLeader', 'bakeryLeader', 'wholefoodLeader', 'outletManager']

/** daily-updates.md §6, M17-F07. Runs at 08:00 — aggregates same-day compliance, escalated tasks, and open issues for GM + HR Manager. */
export const sendDailyDigest = onSchedule({ schedule: '0 8 * * *', region: REGION }, async () => {
  const today = todayIso()

  const [leadersSnap, reportsSnap, tasksSnap] = await Promise.all([
    db.collection(COLLECTIONS.USERS).where('roleId', 'in', LEADER_ROLES).where('status', '==', 'active').get(),
    db.collection(COLLECTIONS.DAILY_REPORTS).where('date', '==', today).get(),
    db.collection(COLLECTIONS.TASKS).where('tags', 'array-contains', DAILY_UPDATE_TAG).get(),
  ])

  const expectedOutletDepartments = new Set(
    leadersSnap.docs
      .map((doc) => `${doc.data().outletId}::${doc.data().departmentId}`)
      .filter((key) => key !== 'undefined::undefined'),
  )
  const compliancePercent =
    expectedOutletDepartments.size === 0 ? 100 : Math.round((reportsSnap.size / expectedOutletDepartments.size) * 100)

  let openIssueCount = 0
  let escalatedCount = 0
  for (const doc of tasksSnap.docs) {
    const task = doc.data()
    if (CLOSED_TASK_STATUSES.includes(task.taskStatus)) continue
    openIssueCount += 1
    if (((task.escalationLevel as number | undefined) ?? 0) >= 1) escalatedCount += 1
  }

  const message = `${reportsSnap.size}/${expectedOutletDepartments.size} departments reported (${compliancePercent}%) · ${escalatedCount} escalated task(s) · ${openIssueCount} open issue(s).`

  await Promise.all([
    notifyUsersByRole({
      role: 'generalManager',
      module: 'operations',
      title: 'Daily Operations Digest',
      message,
      priority: 'informational',
    }),
    notifyUsersByRole({
      role: 'hrManager',
      module: 'operations',
      title: 'Daily Operations Digest',
      message,
      priority: 'informational',
    }),
  ])
})
