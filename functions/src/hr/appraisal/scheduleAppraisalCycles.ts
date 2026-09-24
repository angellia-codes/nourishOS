import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE, todayIso, updatedFields, type AuthedUser } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { createAppraisalInternal } from './createAppraisal'
import { nextCycleWithin, reminderStage, stagesThrough, daysBetween, type ReminderStage } from './cycles'
import { notifyAppraisalParties } from './notifyParties'

const SYSTEM_USER: AuthedUser = {
  uid: 'system:scheduleAppraisalCycles',
  email: null,
  displayName: 'System (Appraisal Cycle Scheduler)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
  employeeId: null,
}

const REMINDER_COPY: Record<ReminderStage, { title: string; priority: 'high' | 'critical' }> = {
  d14: { title: 'Appraisal due in 14 days', priority: 'high' },
  d7: { title: 'Appraisal due in 7 days', priority: 'high' },
  overdue: { title: 'Appraisal overdue', priority: 'critical' },
}

/**
 * §8 as revised 2026-09-24 (cycles.ts has the full rule) — daily 06:00 WITA:
 *
 * 1. Create: every active employee whose next join-date cycle is due within
 *    30 days gets a draft appraisal (createAppraisalInternal notifies the
 *    scorer role, HR Manager and GM). The deterministic periodLabel makes the
 *    existing duplicate guard the idempotency key, so a re-run or a
 *    manually-created appraisal for the same cycle is a silent no-op.
 * 2. Escalate: every draft appraisal (primary score not yet submitted) gets a
 *    D-14 and D-7 reminder to scorer/HR/GM, then one overdue notice to GM.
 *    `remindersSent` records the stages so nothing double-sends.
 *
 * Failures still report to HR as one digest, never one notification each.
 */
export const scheduleAppraisalCycles = onSchedule(
  { schedule: '0 6 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const today = todayIso()
    const failures: string[] = []
    let created = 0
    let staleWarnings = 0

    const activeSnap = await db.collection(COLLECTIONS.EMPLOYEES).where('status', '==', 'active').get()
    for (const doc of activeSnap.docs) {
      const employee = doc.data()
      const joinDate = employee.joinDate as string | undefined
      if (!joinDate) continue
      const cycle = nextCycleWithin(joinDate, (employee.probationEndDate as string | null | undefined) ?? null, today)
      if (!cycle) continue

      const fullName = (employee.fullName as string | undefined) ?? doc.id
      try {
        const result = await createAppraisalInternal(SYSTEM_USER, {
          employeeId: doc.id,
          reviewType: cycle.reviewType,
          periodLabel: cycle.periodLabel,
          periodStart: cycle.periodStart,
          periodEnd: cycle.dueDate,
          dueDate: cycle.dueDate,
        })
        created += 1
        if (result.isStaleTemplate) {
          staleWarnings += 1
          failures.push(`${fullName} (${cycle.reviewType}) — created off a STALE template, review recommended.`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'
        if (message.includes('already exists')) continue // idempotency no-op, not a real skip
        // Retried daily across the 30-day window; report to HR only at the
        // escalation points so an unfixed skip isn't in every day's digest.
        if (![30, 14, 7].includes(daysBetween(today, cycle.dueDate))) continue
        failures.push(`${fullName} (${cycle.reviewType}, due ${cycle.dueDate}) — ${message}`)
      }
    }

    // Escalation — only appraisals still waiting on the primary score.
    const draftSnap = await db
      .collection(COLLECTIONS.APPRAISALS)
      .where('status', '==', 'draft')
      .where('scoringModelVersion', '==', 2)
      .get()
    for (const doc of draftSnap.docs) {
      const appraisal = doc.data()
      const dueDate = appraisal.dueDate as string | undefined
      if (!dueDate) continue // created before due dates existed
      const stage = reminderStage(dueDate, today, (appraisal.remindersSent as string[] | undefined) ?? [])
      if (!stage) continue

      const daysLeft = daysBetween(today, dueDate)
      const copy = REMINDER_COPY[stage]
      try {
        await notifyAppraisalParties({
          appraisalId: doc.id,
          scorerRoleId: (appraisal.primaryScorerRoleId as string | undefined) ?? 'generalManager',
          scorerOutletId: (appraisal.primaryScorerOutletId as string | null | undefined) ?? null,
          title: copy.title,
          message:
            stage === 'overdue'
              ? `${appraisal.periodLabel as string} is ${-daysLeft} day(s) past due and still has no Department Head score.`
              : `${appraisal.periodLabel as string} still needs the Department Head score (${daysLeft} day(s) left).`,
          priority: copy.priority,
          gmOnly: stage === 'overdue',
        })
        await doc.ref.update({
          remindersSent: FieldValue.arrayUnion(...stagesThrough(stage)),
          ...updatedFields(SYSTEM_USER.uid),
        })
      } catch (error) {
        logger.error(`Appraisal reminder failed for ${doc.id}`, error)
      }
    }

    if (failures.length > 0) {
      await notifyUsersByRole({
        role: 'hrManager',
        module: 'hr',
        priority: 'high',
        title: `Appraisal Cycle — ${failures.length} item(s) need attention`,
        message: `${created} appraisal(s) auto-created. ${staleWarnings} used a stale template. ${failures.length} skipped or flagged:\n${failures.join('\n')}`,
        referenceId: today,
      })
    }
  },
)
