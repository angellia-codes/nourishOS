import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  updatedFields,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { notifyStepApprovers } from './notifyApprovers'
import type { ApprovalStepDefinition } from './types'

/** Roles that may approve/reject on behalf of the assigned approver — approval_engine.md §19 "Override". */
const OVERRIDE_ROLES = ['superAdmin']

export const approveStep = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { approvalRequestId, comments } = (request.data ?? {}) as {
      approvalRequestId?: string
      comments?: string
    }

    if (!approvalRequestId) {
      throw new AppError('invalid-argument', 'approvalRequestId is required.')
    }

    const requestRef = db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc(approvalRequestId)
    const requestSnap = await requestRef.get()
    if (!requestSnap.exists) {
      throw new AppError('not-found', 'Approval request not found.')
    }
    const requestData = requestSnap.data()!

    if (requestData.approvalStatus !== 'pending') {
      throw new AppError('failed-precondition', `This request is already ${requestData.approvalStatus}.`)
    }

    const steps = requestData.steps as ApprovalStepDefinition[]
    const currentStep = steps[requestData.currentStepIndex as number]
    const isAssignedApprover = user.roleId === currentStep.approverRole
    if (!isAssignedApprover && !OVERRIDE_ROLES.includes(user.roleId)) {
      throw new AppError('permission-denied', 'You are not the approver for the current step.')
    }

    const isFinalStep = requestData.currentStepIndex >= steps.length - 1
    const newStatus = isFinalStep ? 'approved' : 'pending'
    const nextStepIndex = isFinalStep ? requestData.currentStepIndex : requestData.currentStepIndex + 1

    await requestRef.update({
      approvalStatus: newStatus,
      currentStepIndex: nextStepIndex,
      ...updatedFields(user.uid),
    })

    await db.collection(COLLECTIONS.APPROVAL_HISTORY).add({
      approvalRequestId,
      stepIndex: requestData.currentStepIndex,
      approverUid: user.uid,
      action: 'approve',
      comments: comments ?? null,
      previousStatus: 'pending',
      newStatus,
      timestamp: FieldValue.serverTimestamp(),
    })

    if (!isFinalStep) {
      await db.collection(COLLECTIONS.APPROVAL_STEPS).add({
        approvalRequestId,
        sequence: steps[nextStepIndex].sequence,
        approverRole: steps[nextStepIndex].approverRole,
        stepStatus: 'pending',
        ...newDocumentBaseFields(user.uid),
      })

      await notifyStepApprovers({
        approverRole: steps[nextStepIndex].approverRole,
        module: requestData.module,
        resourceType: requestData.resourceType,
        resourceId: requestData.resourceId,
      })
    }

    await recordAuditEvent({
      eventType: 'ApprovalStepApproved',
      category: 'Approvals',
      module: requestData.module,
      resourceType: requestData.resourceType,
      resourceId: requestData.resourceId,
      action: 'approve',
      user,
      metadata: { approvalRequestId, comments: comments ?? null },
    })

    return successResponse(
      undefined,
      isFinalStep ? 'Approved. Workflow completed.' : 'Approved. Routed to the next approver.',
    )
  } catch (error) {
    handleError(error)
  }
})
