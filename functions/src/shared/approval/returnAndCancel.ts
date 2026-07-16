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
      if (data.requestedBy === user.uid && !isOverride) {
        throw new AppError('permission-denied', 'You cannot action your own request.')
      }

      const currentStepQuery = await tx.get(
        db
          .collection(COLLECTIONS.APPROVAL_STEPS)
          .where('approvalRequestId', '==', approvalRequestId)
          .where('sequence', '==', currentStep.sequence)
          .limit(1),
      )

      tx.update(requestRef, { approvalStatus: 'returnedForRevision', ...updatedFields(user.uid) })

      if (!currentStepQuery.empty) {
        tx.update(currentStepQuery.docs[0].ref, {
          stepStatus: 'returned',
          ...updatedFields(user.uid),
        })
      }

      tx.set(db.collection(COLLECTIONS.APPROVAL_HISTORY).doc(), {
        approvalRequestId,
        stepIndex,
        approverUid: user.uid,
        action: 'returnForRevision',
        comments,
        previousStatus: 'pending',
        newStatus: 'returnedForRevision',
        timestamp: FieldValue.serverTimestamp(),
      })

      return { data }
    })

    await recordAuditEvent({
      eventType: 'ApprovalReturnedForRevision',
      category: 'Approvals',
      module: outcome.data.module,
      resourceType: outcome.data.resourceType,
      resourceId: outcome.data.resourceId,
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

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef)
      if (!snap.exists) throw new AppError('not-found', 'Approval request not found.')
      const data = snap.data()!

      if (data.requestedBy !== user.uid) {
        throw new AppError('permission-denied', 'Only the original requester can cancel this request.')
      }
      if (data.currentStepIndex !== 0 || data.approvalStatus !== 'pending') {
        throw new AppError('failed-precondition', 'This request can no longer be cancelled — a step has already been actioned.')
      }

      const steps = data.steps as ApprovalStepDefinition[]
      const currentStepQuery = await tx.get(
        db
          .collection(COLLECTIONS.APPROVAL_STEPS)
          .where('approvalRequestId', '==', approvalRequestId)
          .where('sequence', '==', steps[0].sequence)
          .limit(1),
      )

      tx.update(requestRef, { approvalStatus: 'cancelled', ...updatedFields(user.uid) })

      if (!currentStepQuery.empty) {
        tx.update(currentStepQuery.docs[0].ref, {
          stepStatus: 'cancelled',
          ...updatedFields(user.uid),
        })
      }

      tx.set(db.collection(COLLECTIONS.APPROVAL_HISTORY).doc(), {
        approvalRequestId,
        stepIndex: data.currentStepIndex,
        approverUid: user.uid,
        action: 'cancel',
        comments: null,
        previousStatus: 'pending',
        newStatus: 'cancelled',
        timestamp: FieldValue.serverTimestamp(),
      })

      return { data }
    })

    await recordAuditEvent({
      eventType: 'ApprovalCancelled',
      category: 'Approvals',
      module: outcome.data.module,
      resourceType: outcome.data.resourceType,
      resourceId: outcome.data.resourceId,
      action: 'cancel',
      user,
    })

    return successResponse(undefined, 'Cancelled.')
  } catch (error) {
    handleError(error)
  }
})
