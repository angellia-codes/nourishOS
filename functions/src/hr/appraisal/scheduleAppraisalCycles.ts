import { onSchedule } from 'firebase-functions/v2/scheduler'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE, todayIso, addDaysIso, type AuthedUser } from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { createAppraisalInternal } from './createAppraisal'

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

/** Last day of the quarter that `dateIso` (YYYY-MM-DD) falls in — Mar 31 / Jun 30 / Sep 30 / Dec 31. */
function isQuarterEnd(dateIso: string): boolean {
  return ['-03-31', '-06-30', '-09-30', '-12-31'].some((suffix) => dateIso.endsWith(suffix))
}

/** True if `joinDateIso`'s month/day matches `dateIso`'s, ignoring year. */
function isAnniversary(joinDateIso: string, dateIso: string): boolean {
  return joinDateIso.slice(5) === dateIso.slice(5)
}

interface Target {
  employeeId: string
  fullName: string
  reviewType: 'probation' | 'quarterly' | 'annual'
  periodLabel: string
  periodStart: string
  periodEnd: string
}

/**
 * §8 — one scheduled function, 06:00 daily, replacing the old
 * probationReviewTrigger.ts's narrower 100-day-from-joinDate rule with the
 * v2 spec's day-75-of-probation (15 days before the decision) plus the two
 * new quarterly/annual triggers. Skip-and-logs: every failure
 * createAppraisalInternal can throw (missing template, unassigned/vacant
 * scorer, non-appraisable position, inactive employee) is caught per
 * employee and reported to HR as one digest, never 40 separate
 * notifications. A duplicate ('already-exists' — an open appraisal for the
 * period, or this job re-running the same day) is a silent no-op, not a
 * digest entry: the exact-day-match queries below already make that case
 * rare, and surfacing it daily would just be noise.
 */
export const scheduleAppraisalCycles = onSchedule(
  { schedule: '0 6 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION },
  async () => {
    const today = todayIso()
    const targets: Target[] = []

    const activeSnap = await db.collection(COLLECTIONS.EMPLOYEES).where('status', '==', 'active').get()
    const employees = activeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>)

    // Probation — day 75 (15 days before the day-90 decision), from probationEndDate.
    const probationTarget = addDaysIso(15)
    for (const employee of employees) {
      if (employee.probationEndDate === probationTarget) {
        targets.push({
          employeeId: employee.id as string,
          fullName: (employee.fullName as string) ?? employee.id as string,
          reviewType: 'probation',
          periodLabel: `Probation - ${probationTarget}`,
          periodStart: employee.joinDate as string,
          periodEnd: probationTarget,
        })
      }
    }

    const pastProbation = (employee: Record<string, unknown>) => {
      const end = employee.probationEndDate as string | null
      return !end || end < today
    }

    // Quarterly — quarter-end, active employees past probation.
    if (isQuarterEnd(today)) {
      const quarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1
      const year = today.slice(0, 4)
      for (const employee of employees) {
        if (!pastProbation(employee)) continue
        targets.push({
          employeeId: employee.id as string,
          fullName: (employee.fullName as string) ?? employee.id as string,
          reviewType: 'quarterly',
          periodLabel: `Q${quarter} ${year}`,
          periodStart: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`,
          periodEnd: today,
        })
      }
    }

    // Annual — join anniversary, active employees past probation.
    for (const employee of employees) {
      if (!pastProbation(employee)) continue
      const joinDate = employee.joinDate as string | undefined
      if (joinDate && isAnniversary(joinDate, today)) {
        targets.push({
          employeeId: employee.id as string,
          fullName: (employee.fullName as string) ?? employee.id as string,
          reviewType: 'annual',
          periodLabel: `FY${today.slice(0, 4)}`,
          periodStart: `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`,
          periodEnd: today,
        })
      }
    }

    const failures: string[] = []
    let created = 0
    let staleWarnings = 0

    for (const target of targets) {
      try {
        const result = await createAppraisalInternal(SYSTEM_USER, target)
        created += 1
        if (result.isStaleTemplate) {
          staleWarnings += 1
          failures.push(`${target.fullName} (${target.reviewType}) — created off a STALE template, review recommended.`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'
        if (message.includes('already exists')) continue // idempotency no-op, not a real skip
        failures.push(`${target.fullName} (${target.reviewType}) — ${message}`)
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
