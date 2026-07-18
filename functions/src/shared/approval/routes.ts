import { AppError } from '../../lib'
import type { ApprovalStepDefinition, ApprovalRouteContext } from './types'

type RouteResolver = ApprovalStepDefinition[] | ((context: ApprovalRouteContext) => ApprovalStepDefinition[])

/**
 * The ONLY place approval routes are defined. Keyed by `module/resourceType`.
 * Adding a new approvable resource = adding a line here (reviewed in a PR),
 * never trusting request.data — clients submit a resource identity only and
 * can no longer pick their own approvers. A route that varies by
 * amount/outlet (Finance thresholds, approval_engine.md §6) is a
 * (context) => steps function; the contract to callers doesn't change.
 */
const APPROVAL_ROUTES: Record<string, RouteResolver> = {
  'hr/appraisal': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  'hr/contract': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  // finance/expenseRequest — expense-request.md §3: ≤ IDR 5,000,000 stops at
  // Finance; above adds GM → Director. "Department Manager" maps to the single
  // outletManager role per outlet (same unambiguous choice as INCIDENT_ROUTING).
  'finance/expenseRequest': ({ amount = 0 }) => {
    const base: ApprovalStepDefinition[] = [
      { sequence: 1, approverRole: 'outletManager' },
      { sequence: 2, approverRole: 'finance' },
    ]
    if (amount > 5_000_000) {
      base.push({ sequence: 3, approverRole: 'generalManager' }, { sequence: 4, approverRole: 'director' })
    }
    return base
  },
  // hr/requisition — employee-requisition.md §5: Dept Leader/Outlet Manager →
  // HR Manager → GM, plus Director when unbudgeted. An HR-Manager-submitted
  // requisition skips straight to GM (§5 row 4) so the requester isn't asked to
  // approve their own request (self-approval is blocked by the engine).
  'hr/requisition': ({ budgeted = true, requestedByRole }) => {
    const base: ApprovalStepDefinition[] =
      requestedByRole === 'hrManager'
        ? [{ sequence: 1, approverRole: 'generalManager' }]
        : [
            { sequence: 1, approverRole: 'outletManager' },
            { sequence: 2, approverRole: 'hrManager' },
            { sequence: 3, approverRole: 'generalManager' },
          ]
    if (!budgeted) {
      base.push({ sequence: base.length + 1, approverRole: 'director' })
    }
    return base
  },
  // operations/workOrder, ... — added as modules ship.
}

export function getApprovalRoute(
  module: string,
  resourceType: string,
  context: ApprovalRouteContext = {},
): ApprovalStepDefinition[] {
  const resolver = APPROVAL_ROUTES[`${module}/${resourceType}`]
  const route = typeof resolver === 'function' ? resolver(context) : resolver
  if (!route || route.length === 0) {
    throw new AppError(
      'failed-precondition',
      `No approval route is configured for ${module}/${resourceType}. Routes are defined server-side in shared/approval/routes.ts.`,
    )
  }
  return route
}
