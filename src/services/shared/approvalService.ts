import { callFunction } from '@/services/api'
import {
  getDocument,
  queryDocuments,
  subscribeToCollection,
  subscribeToDocument,
  where,
  orderBy,
} from '@/services/firestore'
import { COLLECTIONS, ROLES } from '@/constants'
import type { ApprovalRequest, ApprovalStep, ApprovalHistoryEntry } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

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

/**
 * Mirrors approveStep.ts's own authorization checks, so a record's detail page
 * can decide whether to show Approve/Reject at all. This is UX only — the
 * callable re-checks everything server-side — so a stale or wrong verdict here
 * just shows or hides a button; it enforces nothing.
 */
export function canActOnApprovalRequest(
  request: Pick<ApprovalRequest, 'approvalStatus' | 'currentStepIndex' | 'steps' | 'requestedBy'>,
  actor: { uid: string; roleId: string; outletId: string } | null | undefined,
): boolean {
  if (!actor || request.approvalStatus !== 'pending') return false
  const step = request.steps[request.currentStepIndex]
  if (!step) return false
  if (actor.roleId === ROLES.SUPER_ADMIN) return true
  if (actor.roleId !== step.approverRole) return false
  if (step.approverOutletId && actor.outletId !== step.approverOutletId) return false
  if (request.requestedBy === actor.uid) return false
  return true
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

/** One live step plus the request it belongs to — what a queue row needs. */
export interface ApprovalQueueRow {
  step: ApprovalStep
  request: ApprovalRequest
}

/**
 * The personal approval queue — approval_engine.md §10.
 *
 * Queried off `approvalSteps` rather than `approvalRequests` because the engine
 * routes by role: the live step carries `approverRole`, and the equivalent on
 * the request (`steps[currentStepIndex].approverRole`) is an array-index lookup
 * Firestore cannot query. `approvalSteps` is readable by any signed-in user, and
 * every approverRole in routes.ts is on the `approvalRequests` read rule's
 * elevated list, so the join back is allowed — add a role to that rule if a
 * future route ever names one outside it.
 *
 * superAdmin is an override approver (OVERRIDE_ROLES in the engine) but is never
 * named as an approverRole, so its queue would always be empty. It gets every
 * pending step instead — one equality filter, no orderBy, so it needs no
 * composite index and sorts client-side.
 *
 * ponytail: one request read per queued step. A personal queue is a handful of
 * rows — denormalise a currentApproverRole onto approvalRequests if it ever isn't.
 */
export function subscribeToApprovalQueue(
  roleId: string,
  onChange: (rows: ApprovalQueueRow[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const isOverride = roleId === ROLES.SUPER_ADMIN
  // The join is async, so two snapshots in quick succession can resolve out of
  // order. Only the newest one is allowed to emit.
  let latest = 0

  return subscribeToCollection<ApprovalStep>(
    COLLECTIONS.APPROVAL_STEPS,
    isOverride
      ? [where('stepStatus', '==', 'pending')]
      : [where('approverRole', '==', roleId), where('stepStatus', '==', 'pending'), orderBy('createdAt', 'desc')],
    (steps) => {
      const ordered = isOverride ? [...steps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : steps
      const token = ++latest

      void Promise.all(
        ordered.map(async (step) => {
          const request = await getApprovalRequest(step.approvalRequestId).catch(() => null)
          return request ? { step, request } : null
        }),
      ).then((rows) => {
        if (token !== latest) return
        onChange(rows.filter((row): row is ApprovalQueueRow => row !== null))
      })
    },
    onError,
  )
}

/**
 * What this user submitted. The status filter is applied by the caller rather
 * than in the query: one equality on requestedBy matches a single branch of the
 * approvalRequests read rule, which is what keeps the whole subscription from
 * failing on a row the reader can't see.
 */
export function subscribeToMyApprovalRequests(
  uid: string,
  onChange: (requests: ApprovalRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ApprovalRequest>(
    COLLECTIONS.APPROVAL_REQUESTS,
    [where('requestedBy', '==', uid), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
