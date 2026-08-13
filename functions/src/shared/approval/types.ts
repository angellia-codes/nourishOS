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
 * Note: no `steps` field. Routes are server-owned (see routes.ts) — the
 * caller identifies the resource, the engine resolves who approves it.
 */
export interface SubmitApprovalInternalInput {
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
}
