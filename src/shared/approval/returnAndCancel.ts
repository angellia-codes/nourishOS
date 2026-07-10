import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import type { ApprovalStepDefinition } from './types'

const OVERRIDE_ROLES = ['superAdmin']

/**
 * KNOWN GAP: this sets the approvalRequests status to 'returnedForRevision'
 * and records history, but no resourceType handler currently reacts to it
 * (registry.ts only dispatches 'approved' / 'rejected' — see triggers.ts).
 * Appraisal doesn't use this action yet. Wire a handler here before any
 * module exposes a "return for revision" button in the UI.
 */
export const returnForRevision = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { approvalRequestId, comments } = (request.data ?? {}) as {
      approvalRequestId?: string
      comments?: string
    }

    if (!approvalRequestId || !comments?.trim()) {
      throw new AppError('invalid-argument', 'approvalRequestId and comments are required.')
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

    await requestRef.update({ approvalStatus: 'returnedForRevision', ...updatedFields(user.uid) })

    await db.collection(COLLECTIONS.APPROVAL_HISTORY).add({
      approvalRequestId,
      stepIndex: requestData.currentStepIndex,
      approverUid: user.uid,
      action: 'returnForRevision',
      comments,
      previousStatus: 'pending',
      newStatus: 'returnedForRevision',
      timestamp: FieldValue.serverTimestamp(),
    })

    await recordAuditEvent({
      eventType: 'ApprovalReturnedForRevision',
      category: 'Approvals',
      module: requestData.module,
      resourceType: requestData.resourceType,
      resourceId: requestData.resourceId,
      action: 'returnForRevision',
      user,
      metadata: { approvalRequestId, comments },
    })

    return successResponse(undefined, 'Returned for revision.')
  } catch (error) {
    handleError(error)
  }
})

/** Per approval_engine.md §19: only the original requester, and only before any step has approved. */
export const cancelApproval = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { approvalRequestId } = (request.data ?? {}) as { approvalRequestId?: string }

    if (!approvalRequestId) {
      throw new AppError('invalid-argument', 'approvalRequestId is required.')
    }

    const requestRef = db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc(approvalRequestId)
    const requestSnap = await requestRef.get()
    if (!requestSnap.exists) {
      throw new AppError('not-found', 'Approval request not found.')
    }
    const requestData = requestSnap.data()!

    if (requestData.requestedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the original requester can cancel this request.')
    }
    if (requestData.currentStepIndex !== 0 || requestData.approvalStatus !== 'pending') {
      throw new AppError('failed-precondition', 'This request can no longer be cancelled — a step has already been actioned.')
    }

    await requestRef.update({ approvalStatus: 'cancelled', ...updatedFields(user.uid) })

    await db.collection(COLLECTIONS.APPROVAL_HISTORY).add({
      approvalRequestId,
      stepIndex: requestData.currentStepIndex,
      approverUid: user.uid,
      action: 'cancel',
      comments: null,
      previousStatus: 'pending',
      newStatus: 'cancelled',
      timestamp: FieldValue.serverTimestamp(),
    })

    await recordAuditEvent({
      eventType: 'ApprovalCancelled',
      category: 'Approvals',
      module: requestData.module,
      resourceType: requestData.resourceType,
      resourceId: requestData.resourceId,
      action: 'cancel',
      user,
    })

    return successResponse(undefined, 'Cancelled.')
  } catch (error) {
    handleError(error)
  }
})
