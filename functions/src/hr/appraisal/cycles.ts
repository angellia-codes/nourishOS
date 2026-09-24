/**
 * Join-date appraisal cycles and their escalation stages.
 *
 * Deviation from appraisal-v2-design.md §8 (2026-09-24, requested by HR):
 * the design used calendar quarter-ends plus the join anniversary. Cycles are
 * now every 90 days from each employee's own join date —
 *
 *   day 90  probation (or the employee's probationEndDate when set)
 *   day 180 quarterly, day 270 quarterly, day 360 annual,
 *   then repeating: 450/540/630 quarterly, 720 annual, …
 *
 * — created 30 days before the due date, with reminders at D-14 and D-7 while
 * the primary score is still outstanding and one overdue notice after D-day.
 *
 * Pure (no firebase-admin import) so functions/test can load it directly.
 */
import type { AppraisalReviewType } from './types'

export const CYCLE_DAYS = 90
export const CREATE_WINDOW_DAYS = 30

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)
}

export interface AppraisalCycle {
  /** 1-based: 1 = probation, 4 = first annual, 5 = year-2 Q1, … */
  cycleIndex: number
  reviewType: AppraisalReviewType
  dueDate: string
  periodStart: string
  /** Deterministic, so createAppraisalInternal's employeeId+reviewType+periodLabel guard is the idempotency key. */
  periodLabel: string
}

export function cycleFor(joinDate: string, cycleIndex: number, probationEndDate?: string | null): AppraisalCycle {
  const year = Math.ceil(cycleIndex / 4)
  const slot = ((cycleIndex - 1) % 4) + 1
  const dueDate =
    cycleIndex === 1 && probationEndDate ? probationEndDate : addDays(joinDate, CYCLE_DAYS * cycleIndex)
  const periodStart = cycleIndex === 1 ? joinDate : addDays(joinDate, CYCLE_DAYS * (cycleIndex - 1))

  let reviewType: AppraisalReviewType
  let periodLabel: string
  if (cycleIndex === 1) {
    reviewType = 'probation'
    periodLabel = `Probation · due ${dueDate}`
  } else if (slot === 4) {
    reviewType = 'annual'
    periodLabel = `Annual · Year ${year} · due ${dueDate}`
  } else {
    reviewType = 'quarterly'
    periodLabel = `Quarterly · Year ${year} Q${slot} · due ${dueDate}`
  }
  return { cycleIndex, reviewType, dueDate, periodStart, periodLabel }
}

/**
 * The employee's next cycle that is due today or later, if it falls within
 * `windowDays`. Missed past cycles are deliberately not returned — HR creates
 * any catch-up review by hand. A probationEndDate later than day 90 pushes out
 * any quarterly that would otherwise land on or before it.
 */
export function nextCycleWithin(
  joinDate: string,
  probationEndDate: string | null | undefined,
  today: string,
  windowDays = CREATE_WINDOW_DAYS,
): AppraisalCycle | null {
  const next = nextCycleFrom(joinDate, probationEndDate, today)
  return daysBetween(today, next.dueDate) <= windowDays ? next : null
}

function nextCycleFrom(joinDate: string, probationEndDate: string | null | undefined, today: string): AppraisalCycle {
  const probation = cycleFor(joinDate, 1, probationEndDate)
  if (probation.dueDate >= today) return probation
  const elapsed = daysBetween(joinDate, today)
  for (let k = Math.max(2, Math.floor(elapsed / CYCLE_DAYS)); ; k += 1) {
    const cycle = cycleFor(joinDate, k)
    if (cycle.dueDate >= today && cycle.dueDate > probation.dueDate) return cycle
  }
}

export type ReminderStage = 'd14' | 'd7' | 'overdue'
const STAGE_ORDER: ReminderStage[] = ['d14', 'd7', 'overdue']

/**
 * The reminder that is due now and not yet sent, or null. A missed daily run
 * never skips the most urgent reminder and never double-sends: the caller
 * records every stage up to and including the returned one (stagesThrough).
 */
export function reminderStage(dueDate: string, today: string, sent: readonly string[]): ReminderStage | null {
  const daysLeft = daysBetween(today, dueDate)
  let stage: ReminderStage | null = null
  if (daysLeft < 0) stage = 'overdue'
  else if (daysLeft <= 7) stage = 'd7'
  else if (daysLeft <= 14) stage = 'd14'
  return stage && !sent.includes(stage) ? stage : null
}

export function stagesThrough(stage: ReminderStage): ReminderStage[] {
  return STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(stage) + 1)
}
