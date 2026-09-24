/**
 * Who may enter an appraisal's primary (Department Head / GM) score.
 *
 * Deviation from appraisal-v2-design.md §2.3 (2026-09-24): the design resolved
 * the Dept Head as "the NourishOS account linked to the employee occupying
 * `appraisalScorerPositionId`", which needs `users/{uid}.employeeId` — a link
 * nothing in this codebase populates. Every dualScorer appraisal therefore
 * failed with "scorer seat is vacant". The scorer is now resolved by RBAC role
 * plus the subject's outlet, so neither the scorer nor the subject needs a
 * linked employee record.
 *
 * Pure (no firebase-admin import) so functions/test can load it directly.
 * Mirrored client-side by canActAsPrimaryScorer in
 * src/features/hr/services/appraisalService.ts — keep both in step.
 */

/**
 * Scorer position (POSITIONS_MASTER_DESIGN.md §5, the values of
 * positionSeeds.ts's APPRAISAL_SCORER_MAP) → the RBAC role that holds that
 * seat. A position id that is not listed is taken to be its own role id,
 * which is already true for headChef, chiefBaker, barManager,
 * restaurantManager and restaurantMaintenanceManager.
 */
export const SCORER_POSITION_ROLE: Record<string, string> = {
  wholefoodManager: 'wholefoodLeader',
  chiefAccounting: 'finance',
  purchasingManager: 'purchasing',
  creativeMarketingManager: 'marketing',
  groupHrManager: 'hrManager',
}

export function scorerRoleFor(scorerPositionId: string): string {
  return SCORER_POSITION_ROLE[scorerPositionId] ?? scorerPositionId
}

export interface PrimaryScorerFields {
  primaryScorerUid?: string | null
  /** Absent on appraisals created before 2026-09-24 — those stay uid-only. */
  primaryScorerRoleId?: string | null
  /** null = any outlet (no holder of the role existed at the subject's outlet). */
  primaryScorerOutletId?: string | null
}

export interface ScorerActor {
  uid: string
  roleId: string
  outletId: string | null
}

export function canActAsPrimaryScorer(appraisal: PrimaryScorerFields, actor: ScorerActor): boolean {
  if (appraisal.primaryScorerUid && appraisal.primaryScorerUid === actor.uid) return true
  if (!appraisal.primaryScorerRoleId || appraisal.primaryScorerRoleId !== actor.roleId) return false
  return !appraisal.primaryScorerOutletId || appraisal.primaryScorerOutletId === actor.outletId
}
