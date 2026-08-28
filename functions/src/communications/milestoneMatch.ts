/**
 * Pure milestone date matching — no Firestore, no firebase-functions imports,
 * so `functions/test/milestone-match.mjs` can exercise it with plain `node`
 * (the same no-emulator convention `communicationSteps.ts` follows).
 */

export type MilestoneKind = 'birthday' | 'anniversary' | 'newHire' | 'farewell'

export const MILESTONE_KINDS: MilestoneKind[] = ['birthday', 'anniversary', 'newHire', 'farewell']

/** The subset of the Employee document this matcher reads. */
export interface MilestoneCandidate {
  status?: string
  birthDate?: string | null
  joinDate?: string | null
  lastWorkingDate?: string | null
  disciplinaryType?: string | null
}

/**
 * Which milestones an employee hits on `today` ('YYYY-MM-DD', WITA).
 *
 * `birthDate` and `joinDate` are full dates, so `contractAlerts.ts`'s
 * exact-day equality query cannot express a recurring MM-DD — the comparison
 * has to happen in memory, on a string slice, which is also why the job reads
 * the whole collection instead of filtering server-side.
 *
 * Three rules that are not obvious from the field names:
 *
 * - The hire day is a `newHire`, never a year-0 `anniversary` — hence the
 *   strictly-earlier year guard.
 * - `farewell` deliberately ignores `status`. `archiveEmployee` flips an
 *   employee to `inactive` the moment HR records the resignation, which is
 *   normally days before the last working day, so an active-only filter would
 *   miss every farewell there is.
 * - A termination gets no farewell post. The fields cannot tell a resignation
 *   from a dismissal any other way, and an auto-published send-off for someone
 *   dismissed for cause is the one failure mode here that is socially
 *   expensive rather than merely wrong.
 *
 * ponytail: a 29 February birthday matches only in leap years. Fixing it means
 * choosing 28 Feb or 1 Mar for the company, which is HR's call, not a default.
 */
export function milestonesFor(employee: MilestoneCandidate, today: string): MilestoneKind[] {
  const kinds: MilestoneKind[] = []
  const monthDay = today.slice(5)
  const year = Number(today.slice(0, 4))
  const isActive = employee.status === 'active'

  if (isActive && employee.birthDate && employee.birthDate.slice(5) === monthDay) {
    kinds.push('birthday')
  }

  if (isActive && employee.joinDate) {
    if (employee.joinDate === today) {
      kinds.push('newHire')
    } else if (employee.joinDate.slice(5) === monthDay && Number(employee.joinDate.slice(0, 4)) < year) {
      kinds.push('anniversary')
    }
  }

  if (employee.lastWorkingDate === today && employee.disciplinaryType !== 'termination') {
    kinds.push('farewell')
  }

  return kinds
}

/** Completed years of service on `today`. Only meaningful for an `anniversary`. */
export function yearsOfService(joinDate: string, today: string): number {
  return Number(today.slice(0, 4)) - Number(joinDate.slice(0, 4))
}
