import { AppError } from '../../lib'
import type { ApprovalStepDefinition } from './types'

/**
 * The ONLY place approval routes are defined. Keyed by `module/resourceType`.
 * Adding a new approvable resource = adding a line here (reviewed in a PR),
 * never trusting request.data — clients submit a resource identity only and
 * can no longer pick their own approvers. When routes need to vary by
 * amount/outlet (Finance thresholds, approval_engine.md §6), this value
 * becomes a (context) => steps function — the contract to callers doesn't
 * change.
 */
const APPROVAL_ROUTES: Record<string, ApprovalStepDefinition[]> = {
  'hr/appraisal': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  'hr/contract': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  // finance/expense, operations/workOrder, ... — added as modules ship.
}

export function getApprovalRoute(module: string, resourceType: string): ApprovalStepDefinition[] {
  const route = APPROVAL_ROUTES[`${module}/${resourceType}`]
  if (!route || route.length === 0) {
    throw new AppError(
      'failed-precondition',
      `No approval route is configured for ${module}/${resourceType}. Routes are defined server-side in shared/approval/routes.ts.`,
    )
  }
  return route
}
