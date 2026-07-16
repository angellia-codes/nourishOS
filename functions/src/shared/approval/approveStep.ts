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

/**
 * Transactional: status + step index are re-read inside the transaction, so
 * two concurrent approvals (or a double-click) serialize — the second one
 * sees the advanced state and fails its precondition instead of
 * double-advancing currentStepIndex. The live approvalSteps doc is closed
 * out in the same transaction, so step docs can no longer be abandoned at
 * 'pending' forever.
 */
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
      // approval_engine.md §23 — the requester never approves their own
      // request, even if they hold the approver role for this step.
      if (data.requestedBy === user.uid && !isOverride) {
        throw new AppError('permission-denied', 'You cannot approve your own request.')
      }

      // Firestore transactions require every read to happen before the first
      // write — so the live step doc is looked up here, not after tx.update().
      const currentStepQuery = await tx.get(
        db
          .collection(COLLECTIONS.APPROVAL_STEPS)
          .where('approvalRequestId', '==', approvalRequestId)
          .where('sequence', '==', currentStep.sequence)
          .limit(1),
      )

      const isFinalStep = stepIndex >= steps.length - 1
      const newStatus = isFinalStep ? 'approved' : 'pending'
      const nextStepIndex = isFinalStep ? stepIndex : stepIndex + 1

      tx.update(requestRef, {
        approvalStatus: newStatus,
        currentStepIndex: nextStepIndex,
        ...updatedFields(user.uid),
      })

      // Close out the live step doc instead of abandoning it at 'pending'.
      if (!currentStepQuery.empty) {
        tx.update(currentStepQuery.docs[0].ref, {
          stepStatus: 'approved',
          approvedBy: user.uid,
          approvedAt: FieldValue.serverTimestamp(),
          ...updatedFields(user.uid),
        })
      }

      if (!isFinalStep) {
        tx.set(db.collection(COLLECTIONS.APPROVAL_STEPS).doc(), {
          approvalRequestId,
          sequence: steps[nextStepIndex].sequence,
          approverRole: steps[nextStepIndex].approverRole,
          stepStatus: 'pending',
          ...newDocumentBaseFields(user.uid),
        })
      }

      // History written atomically with the state change — an approval can
      // no longer succeed while its history write is lost, or vice versa.
      tx.set(db.collection(COLLECTIONS.APPROVAL_HISTORY).doc(), {
        approvalRequestId,
        stepIndex,
        approverUid: user.uid,
        action: isOverride && user.roleId !== currentStep.approverRole ? 'approve_override' : 'approve',
        comments: comments ?? null,
        previousStatus: 'pending',
        newStatus,
        timestamp: FieldValue.serverTimestamp(),
      })

      return { isFinalStep, nextStep: isFinalStep ? null : steps[nextStepIndex], data }
    })

    // Side effects that don't need atomicity stay outside the transaction.
    if (outcome.nextStep) {
      await notifyStepApprovers({
        approverRole: outcome.nextStep.approverRole,
        module: outcome.data.module,
        resourceType: outcome.data.resourceType,
        resourceId: outcome.data.resourceId,
      })
    }

    await recordAuditEvent({
      eventType: 'ApprovalStepApproved',
      category: 'Approvals',
      module: outcome.data.module,
      resourceType: outcome.data.resourceType,
      resourceId: outcome.data.resourceId,
      action: 'approve',
      user,
      metadata: { approvalRequestId, comments: comments ?? null },
    })

    return successResponse(
      undefined,
      outcome.isFinalStep ? 'Approved. Workflow completed.' : 'Approved. Routed to the next approver.',
    )
  } catch (error) {
    handleError(error)
  }
})
