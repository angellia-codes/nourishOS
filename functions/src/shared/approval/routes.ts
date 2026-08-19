import { AppError } from '../../lib'
import { buildExpenseApprovalSteps } from '../../finance/expenseSteps'
import { buildCommunicationApprovalSteps } from '../../hr/employees/communicationSteps'
import type { ApprovalRouteContext, ApprovalStepDefinition } from './types'

/**
 * The ONLY place approval routes are defined. Keyed by `module/resourceType`.
 * Adding a new approvable resource = adding a line here (reviewed in a PR),
 * never trusting request.data — clients submit a resource identity only and
 * can no longer pick their own approvers.
 *
 * A route is either a fixed list of steps or a `(context) => steps` function
 * for the cases approval_engine.md §6 describes — amount thresholds, outlet
 * routing. The contract to callers is the same either way; what varies is
 * whether the engine consults the context the caller assembled server-side.
 */
type ApprovalRoute = ApprovalStepDefinition[] | ((context: ApprovalRouteContext) => ApprovalStepDefinition[])

const APPROVAL_ROUTES: Record<string, ApprovalRoute> = {
  'hr/appraisal': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  // employee-requisition.md §5 defines a conditional chain (Director joins when
  // the request is unbudgeted) — confirmed with the user this is NOT being
  // built: a permanent product decision, not an open TODO. Director keeps
  // read-only access to requisitions regardless of `budgeted`.
  'recruitment/requisition': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  'hr/contract': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  // HR_OPERATIONS.md §9.2-F10 doesn't specify an exact chain — single-step GM
  // matches company events being a GM-level call, same reasoning 'hr/appraisal' uses.
  'calendar/companyEvent': [{ sequence: 1, approverRole: 'generalManager' }],
  // HR_OPERATIONS.md §9.10 "Project Request — Dept. Manager → GM". The
  // requester is already the department manager in practice, so the chain is
  // the GM step plus HR's operational oversight of company-wide projects.
  'operations/project': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
  ],
  // §9.14 Contract Signing — HR uploads, GM signs, Director signs. Distinct
  // from 'hr/contract' above (renewal approval), because signing is a
  // three-step chain ending at Director and carries its own resolved handler.
  'hr/contractSigning': [
    { sequence: 1, approverRole: 'hrManager' },
    { sequence: 2, approverRole: 'generalManager' },
    { sequence: 3, approverRole: 'director' },
  ],
  // employee_communication.md §17 Department Head → HR → GM. Conditional
  // because "Department Head" resolves from the subject employee's department;
  // the employee acknowledgement stage is not an approval step (see
  // hr/employees/communicationSteps.ts for why).
  'hr/employeeCommunication': buildCommunicationApprovalSteps,
  // The first conditional route — expense-request.md §3 / approval_engine.md §6.
  'finance/expenseRequest': buildExpenseApprovalSteps,
  // operations/workOrder, ... — added as modules ship.
}

export function getApprovalRoute(
  module: string,
  resourceType: string,
  context: ApprovalRouteContext = {},
): ApprovalStepDefinition[] {
  const route = APPROVAL_ROUTES[`${module}/${resourceType}`]
  const steps = typeof route === 'function' ? route(context) : route

  if (!steps || steps.length === 0) {
    throw new AppError(
      'failed-precondition',
      `No approval route is configured for ${module}/${resourceType}. Routes are defined server-side in shared/approval/routes.ts.`,
    )
  }
  return steps
}