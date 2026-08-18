import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE, addDaysIso } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { DEPARTMENT_ROLES } from '../../lib/organization'

const CONTRACT_THRESHOLDS = [90, 60, 30, 14, 7, 0]
const PROBATION_THRESHOLDS = [30, 14, 7]

/**
 * Contract/Probation Tracker — HR_OPERATIONS.md §14.1 threshold algorithm,
 * delivered in-app and over WhatsApp (§9.11's "Contract expiry approaching"
 * and "Probation end approaching" rows) — hence `secrets: [FONNTE_TOKEN]`.
 *
 * Stateless by design: each threshold day passes exactly once as time moves
 * forward, so an exact-day-match query is its own dedup. No `sentFlags` map
 * like the doc's own spec — a deliberate simplification, not an oversight.
 */
export const contractAlerts = onSchedule(
  { schedule: '0 6 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [FONNTE_TOKEN] },
  async () => {
    for (const threshold of CONTRACT_THRESHOLDS) {
      await notifyForThreshold('contractEndDate', threshold, 'Contract Expiring')
    }
    for (const threshold of PROBATION_THRESHOLDS) {
      await notifyForThreshold('probationEndDate', threshold, 'Probation Ending')
    }
  },
)

/**
 * Recipients escalate with urgency: hrManager always, the employee's own
 * department leader added from the 30-day threshold, generalManager added
 * at 7/0 — same DEPARTMENT_ROLES[departmentId][0] lookup Finance's
 * expenseSteps.ts already uses for "the department's leader role".
 */
async function notifyForThreshold(
  field: 'contractEndDate' | 'probationEndDate',
  daysAhead: number,
  title: string,
): Promise<void> {
  const targetDate = addDaysIso(daysAhead)
  const snap = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .where('status', '==', 'active')
    .where(field, '==', targetDate)
    .get()

  for (const doc of snap.docs) {
    const employee = doc.data()
    const priority = daysAhead <= 7 ? 'high' : 'medium'
    const label = field === 'contractEndDate' ? 'contract' : 'probation'
    const message =
      daysAhead === 0
        ? `${employee.fullName as string} (${employee.employeeNumber as string})'s ${label} ends today — ${targetDate}.`
        : `${employee.fullName as string} (${employee.employeeNumber as string})'s ${label} ends in ${daysAhead} day${daysAhead === 1 ? '' : 's'} — ${targetDate}.`

    try {
      await notifyUsersByRole({ role: 'hrManager', module: 'hr', title, message, referenceId: doc.id, priority, whatsapp: true })

      if (daysAhead <= 30) {
        const leaderRole = DEPARTMENT_ROLES[employee.departmentId as string]?.[0]
        if (leaderRole && leaderRole !== 'hrManager') {
          await notifyUsersByRole({ role: leaderRole, module: 'hr', title, message, referenceId: doc.id, priority, whatsapp: true })
        }
      }
      if (daysAhead <= 7) {
        await notifyUsersByRole({
          role: 'generalManager',
          module: 'hr',
          title,
          message,
          referenceId: doc.id,
          priority: 'high',
          whatsapp: true,
        })
      }
    } catch (error) {
      logger.error(`Failed to send ${field} alert for employee ${doc.id} at ${daysAhead}d`, error)
    }
  }
}
