import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ApprovalRequest, ApprovalHistoryEntry } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

/**
 * Client wrapper for the shared Approval Engine (approval_engine.md).
 * Every module submits requests through here rather than writing its own
 * approvalRequests/approvalSteps documents directly — the Cloud Functions
 * behind these calls are what actually enforce sequencing and RBAC.
 */

export interface SubmitApprovalInput {
  module: string
  resourceType: string
  resourceId: string
  /** Omit to let the Cloud Function resolve the configured workflow for module+resourceType. */
  workflowId?: string
  priority?: ApprovalRequest['priority']
}

export function submitApproval(input: SubmitApprovalInput): Promise<{ approvalRequestId: string }> {
  return callFunction('submitApproval', input)
}

export function approveStep(input: { approvalRequestId: string; comments?: string }): Promise<void> {
  return callFunction('approveStep', input)
}

export function rejectStep(input: { approvalRequestId: string; comments: string }): Promise<void> {
  return callFunction('rejectStep', input)
}

export function returnForRevision(input: { approvalRequestId: string; comments: string }): Promise<void> {
  return callFunction('returnForRevision', input)
}

/** Per approval_engine.md §19 — only the original requester, and only before approval starts. */
export function cancelApproval(input: { approvalRequestId: string }): Promise<void> {
  return callFunction('cancelApproval', input)
}

export function getApprovalRequest(approvalRequestId: string): Promise<ApprovalRequest | null> {
  return getDocument<ApprovalRequest>(COLLECTIONS.APPROVAL_REQUESTS, approvalRequestId)
}

export function subscribeToApprovalRequest(
  approvalRequestId: string,
  onChange: (request: ApprovalRequest | null) => void,
): Unsubscribe {
  return subscribeToDocument<ApprovalRequest>(COLLECTIONS.APPROVAL_REQUESTS, approvalRequestId, onChange)
}

export function getApprovalHistory(approvalRequestId: string): Promise<ApprovalHistoryEntry[]> {
  return queryDocuments<ApprovalHistoryEntry>(COLLECTIONS.APPROVAL_HISTORY, [
    where('approvalRequestId', '==', approvalRequestId),
    orderBy('timestamp', 'asc'),
  ])
}
