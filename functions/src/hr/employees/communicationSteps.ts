import { DEPARTMENT_ROLES } from '../../lib/organization'
import type { ApprovalRouteContext, ApprovalStepDefinition } from '../../shared/approval/types'

/** The department's leader role — first entry of its DEPARTMENT_ROLES list, `staff` never being first. */
function departmentLeaderRole(departmentId: string | null | undefined): string | undefined {
  return departmentId ? DEPARTMENT_ROLES[departmentId]?.[0] : undefined
}

/**
 * employee_communication.md §17 — "Department Head → HR Manager → GM", then the
 * employee. The employee step is deliberately NOT here: an approval step names
 * one role id, and the only role a floor employee holds is `staff`, which would
 * let any staff member acknowledge someone else's warning. Acknowledgement is
 * its own callable keyed on the record's `employeeUid` instead
 * (acknowledgeCommunicationRecord in disciplinaryRecords.ts).
 *
 * "Department Head" is likewise not a role that exists — the person who heads a
 * kitchen is `headChef` while a bar is `barManager` — so step 1 is resolved
 * from the subject employee's own department. Same three corrections as
 * finance/expenseSteps.ts, in this order:
 *
 * 1. Drop any step naming the requester's own role. approveStep blocks
 *    self-approval by uid, so a lone headChef filing on their own team
 *    would otherwise land on a step nobody can clear.
 * 2. Dedupe — human_resources' leader role *is* `hrManager`, which would
 *    otherwise ask the same role to approve twice.
 * 3. Floor at generalManager if that empties the chain, because getApprovalRoute
 *    rejects a route with no steps.
 *
 * Pure and dependency-free on purpose: it is asserted directly by
 * functions/test/communication-steps.mjs, which needs no emulator.
 */
export function buildCommunicationApprovalSteps(context: ApprovalRouteContext): ApprovalStepDefinition[] {
  const chain: string[] = []

  const leader = departmentLeaderRole(context.departmentId)
  if (leader) chain.push(leader)

  chain.push('hrManager', 'generalManager')

  const resolved = chain.filter(
    (role, index) => role !== context.requesterRoleId && chain.indexOf(role) === index,
  )
  if (resolved.length === 0) resolved.push('generalManager')

  return resolved.map((approverRole, index) => ({ sequence: index + 1, approverRole }))
}
