import { AppError } from '../../lib'
import { OUTLET_LEAD_ROLE } from '../../lib/organization'
import type { ApprovalRouteContext, ApprovalStepDefinition } from '../../shared/approval/types'

/**
 * equipment-master-design.md §5.2 — Engineering head submits, the asset's own
 * outlet lead approves. Single step, but scoped to one specific outlet via
 * `approverOutletId` (shared/approval/types.ts, added for this) rather than
 * any holder of the role company-wide — the outlet-instance authorization
 * approveStep.ts didn't have before this module needed it.
 *
 * Originally fixed to the single `outletManager` role; that role was removed
 * (2026-08-29 role-id migration) in favor of `OUTLET_LEAD_ROLE`, since no
 * single role spans every outlet type any more.
 */
export function buildEquipmentDecommissionApprovalSteps(context: ApprovalRouteContext): ApprovalStepDefinition[] {
  if (!context.outletId) {
    throw new AppError('failed-precondition', 'A decommission request must carry the asset\'s outletId.')
  }
  const approverRole = OUTLET_LEAD_ROLE[context.outletId]
  if (!approverRole) {
    throw new AppError('failed-precondition', `No outlet lead is configured for outlet "${context.outletId}".`)
  }
  return [{ sequence: 1, approverRole, approverOutletId: context.outletId }]
}
