import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, recordAuditEvent, newDocumentBaseFields, AppError, handleError, successResponse } from '../../lib'
import { getApprovalRoute } from './routes'
import { notifyStepApprovers } from './notifyApprovers'
import type { SubmitApprovalInternalInput } from './types'

/**
 * Pure — no auth/RBAC check. The caller (another Cloud Function, already
 * inside a validated request, e.g. submitAppraisal) owns that. The route is
 * resolved server-side from routes.ts; callers cannot supply steps.
 */
export async function submitApprovalInternal(input: SubmitApprovalInternalInput): Promise<string> {
  const steps = getApprovalRoute(input.module, input.resourceType, input.context)

  const requestRef = db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc()
  const firstStepRef = db.collection(COLLECTIONS.APPROVAL_STEPS).doc()

  // Atomic: the request and its first live step appear together or not at all.
  const batch = db.batch()
  batch.set(requestRef, {
    module: input.module,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestedBy: input.requestedBy,
    currentStepIndex: 0,
    approvalStatus: 'pending',
    priority: input.priority ?? 'medium',
    steps, // denormalized route snapshot — immutable after submission
    ...newDocumentBaseFields(input.requestedBy),
  })
  batch.set(firstStepRef, {
    approvalRequestId: requestRef.id,
    sequence: steps[0].sequence,
    approverRole: steps[0].approverRole,
    stepStatus: 'pending',
    ...newDocumentBaseFields(input.requestedBy),
  })
  await batch.commit()

  await notifyStepApprovers({
    approverRole: steps[0].approverRole,
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
 * this exists for simpler future modules. NOTE: no `steps` accepted here —
 * accepting a client-supplied route was the vulnerability the rewrite fixed.
 */
export const submitApproval = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { module, resourceType, resourceId, priority } = (request.data ?? {}) as {
      module?: string
      resourceType?: string
      resourceId?: string
      priority?: SubmitApprovalInternalInput['priority']
    }

    if (!module || !resourceType || !resourceId) {
      throw new AppError('invalid-argument', 'module, resourceType, and resourceId are required.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module,
      resourceType,
      resourceId,
      requestedBy: user.uid,
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
