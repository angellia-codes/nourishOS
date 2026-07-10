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

export interface SubmitApprovalInternalInput {
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  steps: ApprovalStepDefinition[]
  priority?: 'critical' | 'high' | 'medium' | 'low'
}
