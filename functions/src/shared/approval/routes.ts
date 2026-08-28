import { AppError } from '../../lib'
import { buildExpenseApprovalSteps } from '../../finance/expenseSteps'
import { buildCommunicationApprovalSteps } from '../../hr/employees/communicationSteps'
import { buildPositionApprovalSteps } from '../../hr/positions/approvalSteps'
import { buildEquipmentDecommissionApprovalSteps } from '../../operations/equipment/approvalSteps'
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
  // appraisal-v2-design.md §7 — single-step GM approval, engaged only for
  // dualScorer appraisals (submitSecondaryScores). soloScorer never submits
  // (§5 — no approval step, no rejected path; see reopenAppraisal.ts
  // instead). Supersedes the old fixed hrManager->generalManager
  // 'hr/appraisal' route, which the v1 module (now frozen/historical) no
  // longer has any live caller for.
  'hr/appraisalV2': [{ sequence: 1, approverRole: 'generalManager' }],
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
  // attendance.md §6.1 — HR Manager reviews aggregates/warnings, GM signs off.
  // Fixed chain, same shape as 'hr/contract' — no per-record department to
  // resolve, unlike employeeCommunication/position.
  'people/attendancePeriod': [
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
  // POSITIONS_MASTER_DESIGN.md §8.1 — "Prepared by HR Manager -> Reviewed by
  // Department Head -> Approved by GM", the chain already printed on every
  // JD document. Conditional for the same reason employeeCommunication is:
  // "Department Head" resolves from the position's own departmentId.
  'hr/position': buildPositionApprovalSteps,
  // payroll-components-payslip-design.md §6.1/§8 — a payroll batch is a
  // disbursement authorisation, so it carries the same three-step shape as
  // 'hr/contractSigning' rather than the two-step HR routes. HR assembles the
  // batch and deliberately holds no payroll.approve: whoever built it cannot
  // authorise it. Finance checks the figures, GM and Director sign off.
  'hr/payrollBatch': [
    { sequence: 1, approverRole: 'finance' },
    { sequence: 2, approverRole: 'generalManager' },
    { sequence: 3, approverRole: 'director' },
  ],
  // The first conditional route — expense-request.md §3 / approval_engine.md §6.
  'finance/expenseRequest': buildExpenseApprovalSteps,
  // equipment-master-design.md §5.2 — single-step, but scoped to the asset's
  // own outlet (approverOutletId), not any outletManager company-wide.
  'operations/equipmentDecommission': buildEquipmentDecommissionApprovalSteps,
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