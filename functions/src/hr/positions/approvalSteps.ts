import { DEPARTMENT_ROLES } from '../../lib/organization'
import type { ApprovalRouteContext, ApprovalStepDefinition } from '../../shared/approval/types'

/**
 * POSITIONS_MASTER_DESIGN.md §8.1 — "Prepared by HR Manager → Reviewed by
 * Department Head → Approved by General Manager", the chain already printed
 * on every JD document. Same three corrections buildCommunicationApprovalSteps
 * (functions/src/hr/employees/communicationSteps.ts) established for
 * resolving "Department Head" (not a role that exists — headChef,
 * barManager, etc. differ per department) against a real role id:
 *
 * 1. Drop any step naming the requester's own role — approveStep blocks
 *    self-approval by uid, so an hrManager editing a Human Resources
 *    position would otherwise land on a step nobody can clear.
 * 2. Dedupe — a department whose leader role already IS hrManager
 *    (human_resources) would otherwise ask the same role twice.
 * 3. Floor at generalManager if that empties the chain.
 */
export function buildPositionApprovalSteps(context: ApprovalRouteContext): ApprovalStepDefinition[] {
  const chain: string[] = ['hrManager']

  const leader = context.departmentId ? DEPARTMENT_ROLES[context.departmentId]?.[0] : undefined
  if (leader) chain.push(leader)

  chain.push('generalManager')

  const resolved = chain.filter(
    (role, index) => role !== context.requesterRoleId && chain.indexOf(role) === index,
  )
  if (resolved.length === 0) resolved.push('generalManager')

  return resolved.map((approverRole, index) => ({ sequence: index + 1, approverRole }))
}
