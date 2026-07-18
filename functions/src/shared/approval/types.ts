export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'returnedForRevision'
  | 'cancelled'
  | 'completed'
  | 'expired'

export interface ApprovalStepDefinition {
  sequence: number
  approverRole: string
  slaHours?: number
}

/**
 * Values a server-owned route may branch on (approval_engine.md §6 — Finance
 * routes vary by amount). Optional so array routes ignore it entirely.
 */
export interface ApprovalRouteContext {
  amount?: number
  outletId?: string | null
  departmentId?: string | null
}

/**
 * Note: no `steps` field. Routes are server-owned (see routes.ts) — the
 * caller identifies the resource, the engine resolves who approves it.
 * `context` feeds amount/outlet-conditional routes; it can't name approvers.
 */
export interface SubmitApprovalInternalInput {
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  context?: ApprovalRouteContext
}
