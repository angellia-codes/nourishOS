import type { BaseDocument } from './firestore.types'
import type { ApprovalStatus, ApprovalAction } from '@/constants/statuses'
import type { Role } from '@/constants/roles'

/** A single configured stage within a workflow definition. Source: APPROVAL_ENGINE.md §4. */
export interface ApprovalStepDefinition {
  sequence: number
  approverRole: Role
  slaHours?: number
  conditions?: Record<string, unknown>
  /** equipment-master-design.md §5.2 — scopes this step to one outlet's own approver rather than the role everywhere. */
  approverOutletId?: string
  /**
   * HR_OPERATIONS.md §9.14 — this step's approval should be accompanied by a
   * captured signature image. UX-only: the frontend uses it to decide
   * whether to render SignaturePad; approveStep.ts never enforces it.
   * Omitted by every other route today.
   */
  requiresSignature?: boolean
}

/** Configurable route for a resource type. Source: APPROVAL_ENGINE.md §6. */
export interface ApprovalWorkflow extends BaseDocument {
  module: string
  resourceType: string
  name: string
  steps: ApprovalStepDefinition[]
  /** e.g. { field: "amount", operator: "lte", value: 5000000 } — monetary threshold routing */
  conditions?: Record<string, unknown>
}

/** A live approval instance attached to a business object. Source: APPROVAL_ENGINE.md §4, §11. */
export interface ApprovalRequest extends BaseDocument {
  /**
   * Optional because the engine never writes it: routes are code-owned in
   * functions/src/shared/approval/routes.ts, and the approvalWorkflows
   * collection is declared but unused (approval_engine.md §17).
   */
  workflowId?: string
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  currentStepIndex: number
  approvalStatus: ApprovalStatus
  priority?: 'critical' | 'high' | 'medium' | 'low'
  /** The route snapshotted at submit time — immutable afterwards (submitApproval.ts). */
  steps: ApprovalStepDefinition[]
}

/**
 * The live step document. Only one exists per request at a time: approveStep
 * closes the current one and creates the next, so this collection is a set of
 * in-flight steps rather than a full ledger (that's approvalHistory).
 *
 * `approverRole` is a role string, not a uid — every user holding the role is a
 * valid approver, which is why the personal queue is a role query.
 */
export interface ApprovalStep extends BaseDocument {
  approvalRequestId: string
  sequence: number
  approverRole: Role
  stepStatus: 'pending' | 'approved' | 'rejected' | 'returned'
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
}

/** Immutable per-step record. Source: APPROVAL_ENGINE.md §11. */
export interface ApprovalHistoryEntry {
  id: string
  approvalRequestId: string
  stepIndex: number
  approverUid: string
  action: ApprovalAction
  comments?: string
  /** HR_OPERATIONS.md §9.14 — a files/{id} pointer to a captured signature image, when this step required one. */
  signatureFileId?: string | null
  previousStatus: ApprovalStatus
  newStatus: ApprovalStatus
  timestamp: string
}
