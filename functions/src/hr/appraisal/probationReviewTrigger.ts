import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE, addDaysIso, type AuthedUser } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { DEPARTMENT_ROLES } from '../../lib/organization'
import { createAppraisalInternal } from './createAppraisal'

const SYSTEM_USER: AuthedUser = {
  uid: 'system:probationReviewTrigger',
  email: null,
  displayName: 'System (Probation Review Scheduler)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
}

/**
 * New-hire probation review, auto-created 100 days after joinDate — a new
 * business rule (Departments > People > Performance Review), not the
 * existing months-based probationEndDate the Contract/Probation Tracker
 * (contractAlerts.ts) already alerts on. Same shape as that job: exact-day-
 * match query, deliberately stateless (no dedup flag — each calendar day
 * matches exactly once as time passes).
 */
export const triggerProbationReviews = onSchedule(
  { schedule: '0 6 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const targetJoinDate = addDaysIso(-100)
    const snap = await db
      .collection(COLLECTIONS.EMPLOYEES)
      .where('status', '==', 'active')
      .where('joinDate', '==', targetJoinDate)
      .get()

    for (const doc of snap.docs) {
      const employee = doc.data()
      const fullName = employee.fullName as string
      const employeeNumber = employee.employeeNumber as string

      try {
        const reviewerId = await resolveReviewerUid(employee.departmentId as string | null)
        if (!reviewerId) {
          throw new Error('No active reviewer found (department leader or hrManager).')
        }

        await createAppraisalInternal(SYSTEM_USER, {
          employeeId: doc.id,
          // Employee.position is now validated against the PositionId catalog
          // at create/update time (functions/src/lib/positions.ts), so this
          // matches AppraisalTemplateSeed.positionId for employees hired since
          // that change. Still throws failed-precondition for (a) legacy
          // employees whose position predates the catalog and (b) positions
          // with no seeded probation template yet — both handled below by
          // notifying hrManager instead of failing silently.
          positionId: employee.position as string,
          reviewType: 'probation',
          periodLabel: 'Probation - Day 100',
          reviewerId,
        })
      } catch (error) {
        logger.error(`Failed to auto-create probation review for employee ${doc.id}`, error)
        await notifyUsersByRole({
          role: 'hrManager',
          module: 'hr',
          priority: 'high',
          title: 'Probation Review Not Auto-Created',
          message: `Could not auto-create the 100-day probation review for ${fullName} (${employeeNumber}) — ${error instanceof Error ? error.message : 'unknown error'}. Create it manually.`,
          referenceId: doc.id,
        })
      }
    }
  },
)

/**
 * The department's leader role first (same DEPARTMENT_ROLES[departmentId][0]
 * lookup contractAlerts.ts and Finance's expenseSteps.ts use), falling back
 * to any active hrManager if the department has no leader role or nobody
 * currently holds it — there's no human caller to default reviewerId to.
 */
async function resolveReviewerUid(departmentId: string | null): Promise<string | null> {
  const leaderRole = departmentId ? DEPARTMENT_ROLES[departmentId]?.[0] : undefined
  const candidates = [leaderRole, 'hrManager'].filter((role): role is string => Boolean(role))

  for (const role of candidates) {
    const snap = await db.collection(COLLECTIONS.USERS).where('roleId', '==', role).where('status', '==', 'active').limit(1).get()
    if (!snap.empty) return snap.docs[0].id
  }
  return null
}
