import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, recordAuditEvent, newDocumentBaseFields, AppError, handleError, successResponse } from '../../lib'
import { notifyStepApprovers } from './notifyApprovers'
import type { SubmitApprovalInternalInput } from './types'

/**
 * Pure — no auth/RBAC check. The caller (another Cloud Function, already
 * inside a validated request, e.g. submitAppraisal) owns that. Writes the
 * approvalRequests doc plus its first approvalSteps doc.
 */
export async function submitApprovalInternal(input: SubmitApprovalInternalInput): Promise<string> {
  if (input.steps.length === 0) {
    throw new AppError('failed-precondition', 'A workflow must contain at least one approval step.')
  }

  const requestRef = db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc()

  await requestRef.set({
    module: input.module,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestedBy: input.requestedBy,
    currentStepIndex: 0,
    approvalStatus: 'pending',
    priority: input.priority ?? 'medium',
    // Denormalized copy of the route for quick reads; approvalSteps holds live per-step state.
    steps: input.steps,
    ...newDocumentBaseFields(input.requestedBy),
  })

  await db.collection(COLLECTIONS.APPROVAL_STEPS).add({
    approvalRequestId: requestRef.id,
    sequence: input.steps[0].sequence,
    approverRole: input.steps[0].approverRole,
    stepStatus: 'pending',
    ...newDocumentBaseFields(input.requestedBy),
  })

  await notifyStepApprovers({
    approverRole: input.steps[0].approverRole,
    module: input.module,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
  })

  return requestRef.id
}

/**
 * Generic client-callable entry point — for a module with no submission-time
 * business validation of its own. Appraisal doesn't use this directly (it
 * validates scores are complete first, then calls submitApprovalInternal);
 * this exists for simpler future modules.
 */
export const submitApproval = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { module, resourceType, resourceId, steps, priority } =
      (request.data ?? {}) as Partial<SubmitApprovalInternalInput>

    if (!module || !resourceType || !resourceId || !Array.isArray(steps)) {
      throw new AppError('invalid-argument', 'module, resourceType, resourceId, and steps are required.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module,
      resourceType,
      resourceId,
      requestedBy: user.uid,
      steps,
      priority,
    })

    await recordAuditEvent({
      eventType: 'ApprovalSubmitted',
      category: 'Approvals',
      module,
      resourceType,
      resourceId,
      action: 'submit',
      user,
    })

    return successResponse({ approvalRequestId }, 'Approval request submitted.')
  } catch (error) {
    handleError(error)
  }
})
