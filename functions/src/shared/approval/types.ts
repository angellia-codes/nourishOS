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
  /**
   * Restricts this step to the approver whose own `outletId` matches, on top
   * of the `approverRole` check — equipment-master-design.md §5.2 ("the
   * asset's Outlet Manager", not any outletManager anywhere). Omitted by
   * every other route today; approveStep.ts only applies the check when set.
   */
  approverOutletId?: string
}

/**
 * Facts a route may branch on — approval_engine.md §6 (monetary thresholds,
 * outlet routing). Assembled by the calling Cloud Function from the resource
 * document it has already loaded and validated, NEVER from request.data: a
 * client that could name its own totalAmount could shorten its own chain.
 */
export interface ApprovalRouteContext {
  totalAmount?: number
  departmentId?: string | null
  outletId?: string | null
  requesterRoleId?: string
}

/**
 * Note: no `steps` field. Routes are server-owned (see routes.ts) — the
 * caller identifies the resource, the engine resolves who approves it.
 */
export interface SubmitApprovalInternalInput {
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  /** Only read by routes that branch; a static route ignores it. */
  context?: ApprovalRouteContext
}
