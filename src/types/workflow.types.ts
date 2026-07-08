import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { ApprovalStatus, ApprovalAction } from '@/constants/statuses'
import type { Role } from '@/constants/roles'

/** A single configured stage within a workflow definition. Source: APPROVAL_ENGINE.md §4. */
export interface ApprovalStepDefinition {
  sequence: number
  approverRole: Role
  slaHours?: number
  conditions?: Record<string, unknown>
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
  workflowId: string
  module: string
  resourceType: string
  resourceId: string
  requestedBy: string
  currentStepIndex: number
  approvalStatus: ApprovalStatus
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

/** Immutable per-step record. Source: APPROVAL_ENGINE.md §11. */
export interface ApprovalHistoryEntry {
  id: string
  approvalRequestId: string
  stepIndex: number
  approverUid: string
  action: ApprovalAction
  comments?: string
  previousStatus: ApprovalStatus
  newStatus: ApprovalStatus
  timestamp: Timestamp
}
