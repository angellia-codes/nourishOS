import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE } from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { createTaskInternal } from '../../shared/tasks'
import { currentPeriodMonth, periodMonthEnd, roundReferenceId } from './helpers'

const SYSTEM_ACTOR = 'system'

/**
 * fire-extinguisher.md §5.1 — one round per outlet per month, generated on the
 * 1st at 06:00 WITA.
 *
 * Round granularity is the outlet, not the unit: Uluwatu may hold 14 cylinders
 * and the guard walks the building once. The round holds no unit list — the
 * screen reads the register live — so a cylinder registered on the 8th shows up
 * in the round created on the 1st.
 *
 * Dedup is a single equality query on the round's referenceId, so re-running
 * the job (or a retry) creates nothing.
 */
export const generateMonthlyAparRounds = onSchedule(
  { schedule: '0 6 1 * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const periodMonth = currentPeriodMonth()
    const dueDate = periodMonthEnd(periodMonth)

    for (const outletId of Object.keys(OUTLET_DEPARTMENTS)) {
      try {
        const unitsSnap = await db
          .collection(COLLECTIONS.FIRE_EXTINGUISHERS)
          .where('outletId', '==', outletId)
          .where('isArchived', '==', false)
          .get()
        if (unitsSnap.empty) continue // §6 — outlets with zero active units are skipped

        const referenceId = roundReferenceId(outletId, periodMonth)
        const existing = await db.collection(COLLECTIONS.TASKS).where('referenceId', '==', referenceId).limit(1).get()
        if (!existing.empty) continue

        const assignees = await roundAssignees(outletId)
        if (assignees.length === 0) {
          logger.warn(`No security guard or outlet manager at ${outletId} to assign the ${periodMonth} APAR round to.`)
          continue
        }

        await createTaskInternal({
          title: `Fire Extinguisher Round — ${periodMonth}`,
          description: `Inspect all ${unitsSnap.size} registered extinguisher${unitsSnap.size === 1 ? '' : 's'} at this outlet. Record each unit as you go.`,
          taskType: 'checklist',
          sourceModule: 'security',
          referenceId,
          assignedTo: assignees,
          assignedBy: SYSTEM_ACTOR,
          priority: 'high',
          dueDate,
          tags: ['apar'],
        })
      } catch (error) {
        // One outlet's failure must not skip the rest of them.
        logger.error(`Failed to generate the ${periodMonth} APAR round for ${outletId}`, error)
      }
    }
  },
)

/**
 * §Kebijakan 2 — the round belongs to the outlet's guards; where an outlet has
 * none rostered in the system, its manager gets it rather than the round
 * silently not existing.
 */
async function roundAssignees(outletId: string): Promise<string[]> {
  for (const roleId of ['security', 'outletManager']) {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where('roleId', '==', roleId)
      .where('status', '==', 'active')
      .where('outletId', '==', outletId)
      .get()
    if (!snap.empty) return snap.docs.map((doc) => doc.id)
  }
  return []
}
