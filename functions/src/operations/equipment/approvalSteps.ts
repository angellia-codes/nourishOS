import { AppError } from '../../lib'
import type { ApprovalRouteContext, ApprovalStepDefinition } from '../../shared/approval/types'

/**
 * equipment-master-design.md §5.2 — Engineering head submits, the asset's own
 * Outlet Manager approves. Single step, but scoped to one specific outlet via
 * `approverOutletId` (shared/approval/types.ts, added for this) rather than
 * any `outletManager` company-wide — the outlet-instance authorization
 * approveStep.ts didn't have before this module needed it.
 *
 * Deliberately does NOT use buildCommunicationApprovalSteps's "resolve the
 * leader role from context" pattern: the approver role here is fixed
 * (`outletManager`), only the outlet instance varies.
 */
export function buildEquipmentDecommissionApprovalSteps(context: ApprovalRouteContext): ApprovalStepDefinition[] {
  if (!context.outletId) {
    throw new AppError('failed-precondition', 'A decommission request must carry the asset\'s outletId.')
  }
  return [{ sequence: 1, approverRole: 'outletManager', approverOutletId: context.outletId }]
}
