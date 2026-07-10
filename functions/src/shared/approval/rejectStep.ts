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

export const rejectStep = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { approvalRequestId, comments } = (request.data ?? {}) as {
      approvalRequestId?: string
      comments?: string
    }

    if (!approvalRequestId || !comments?.trim()) {
      throw new AppError(
        'invalid-argument',
        'approvalRequestId and comments are required — rejections must include a reason.',
      )
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

    await requestRef.update({ approvalStatus: 'rejected', ...updatedFields(user.uid) })

    await db.collection(COLLECTIONS.APPROVAL_HISTORY).add({
      approvalRequestId,
      stepIndex: requestData.currentStepIndex,
      approverUid: user.uid,
      action: 'reject',
      comments,
      previousStatus: 'pending',
      newStatus: 'rejected',
      timestamp: FieldValue.serverTimestamp(),
    })

    await recordAuditEvent({
      eventType: 'ApprovalStepRejected',
      category: 'Approvals',
      module: requestData.module,
      resourceType: requestData.resourceType,
      resourceId: requestData.resourceId,
      action: 'reject',
      user,
      metadata: { approvalRequestId, comments },
    })

    return successResponse(undefined, 'Rejected.')
  } catch (error) {
    handleError(error)
  }
})
