import { DEPARTMENT_ROLES } from '../lib/organization'
import type { ApprovalRouteContext, ApprovalStepDefinition } from '../shared/approval/types'

/**
 * approval_engine.md §6 / expense-request.md §3 — the amount above which a
 * request also needs the General Manager and the Director.
 */
export const EXPENSE_APPROVAL_THRESHOLD_IDR = 5_000_000

/** The department's leader role — first entry of its DEPARTMENT_ROLES list, `staff` never being first. */
function departmentLeaderRole(departmentId: string | null | undefined): string | undefined {
  return departmentId ? DEPARTMENT_ROLES[departmentId]?.[0] : undefined
}

/**
 * expense-request.md §3:
 *
 *   ≤ 5,000,000  department leader → finance
 *   > 5,000,000  department leader → finance → generalManager → director
 *
 * "Department Manager" in the spec is not a role that exists — a step names one
 * role id, and the person who manages a kitchen is `headChef` while a bar
 * is `barManager`. So step 1 is resolved from the requester's own department.
 *
 * Three corrections are then applied to the raw chain, in this order:
 *
 * 1. Drop any step naming the requester's own role. approveStep blocks
 *    self-approval by uid, so a lone headChef filing a kitchen expense
 *    would otherwise land on a step nobody can clear.
 * 2. Dedupe — finance_accounting's leader role *is* `finance`, which would
 *    otherwise ask the same role to approve twice.
 * 3. Floor at generalManager if that empties the chain, because a route with no
 *    steps is rejected by getApprovalRoute and a finance user's own ≤5M request
 *    empties it.
 *
 * Pure and dependency-free on purpose: it is asserted directly by
 * functions/test/expense-steps.mjs, which needs no emulator.
 */
export function buildExpenseApprovalSteps(context: ApprovalRouteContext): ApprovalStepDefinition[] {
  const chain: string[] = []

  const leader = departmentLeaderRole(context.departmentId)
  if (leader) chain.push(leader)

  chain.push('finance')

  if ((context.totalAmount ?? 0) > EXPENSE_APPROVAL_THRESHOLD_IDR) {
    chain.push('generalManager', 'director')
  }

  const resolved = chain.filter(
    (role, index) => role !== context.requesterRoleId && chain.indexOf(role) === index,
  )
  if (resolved.length === 0) resolved.push('generalManager')

  return resolved.map((approverRole, index) => ({ sequence: index + 1, approverRole }))
}
