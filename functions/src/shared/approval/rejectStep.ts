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
 * Same transactional shape as approveStep: preconditions re-read inside the
 * transaction (a reject can't race an approve), the live step doc closed
 * out, history written atomically with the state change.
 */
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

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef)
      if (!snap.exists) throw new AppError('not-found', 'Approval request not found.')
      const data = snap.data()!

      if (data.approvalStatus !== 'pending') {
        throw new AppError('failed-precondition', `This request is already ${data.approvalStatus}.`)
      }

      const steps = data.steps as ApprovalStepDefinition[]
      const stepIndex = data.currentStepIndex as number
      const currentStep = steps[stepIndex]

      const isOverride = OVERRIDE_ROLES.includes(user.roleId)
      if (user.roleId !== currentStep.approverRole && !isOverride) {
        throw new AppError('permission-denied', 'You are not the approver for the current step.')
      }
      // approval_engine.md §23 — same rule as approve: the requester never
      // actions their own request.
      if (data.requestedBy === user.uid && !isOverride) {
        throw new AppError('permission-denied', 'You cannot action your own request.')
      }

      // All reads before the first write — Firestore transaction requirement.
      const currentStepQuery = await tx.get(
        db
          .collection(COLLECTIONS.APPROVAL_STEPS)
          .where('approvalRequestId', '==', approvalRequestId)
          .where('sequence', '==', currentStep.sequence)
          .limit(1),
      )

      tx.update(requestRef, { approvalStatus: 'rejected', ...updatedFields(user.uid) })

      if (!currentStepQuery.empty) {
        tx.update(currentStepQuery.docs[0].ref, {
          stepStatus: 'rejected',
          rejectedBy: user.uid,
          rejectedAt: FieldValue.serverTimestamp(),
          ...updatedFields(user.uid),
        })
      }

      tx.set(db.collection(COLLECTIONS.APPROVAL_HISTORY).doc(), {
        approvalRequestId,
        stepIndex,
        approverUid: user.uid,
        action: isOverride && user.roleId !== currentStep.approverRole ? 'reject_override' : 'reject',
        comments,
        previousStatus: 'pending',
        newStatus: 'rejected',
        timestamp: FieldValue.serverTimestamp(),
      })

      return { data }
    })

    await recordAuditEvent({
      eventType: 'ApprovalStepRejected',
      category: 'Approvals',
      module: outcome.data.module,
      resourceType: outcome.data.resourceType,
      resourceId: outcome.data.resourceId,
      action: 'reject',
      user,
      metadata: { approvalRequestId, comments },
    })

    return successResponse(undefined, 'Rejected.')
  } catch (error) {
    handleError(error)
  }
})
