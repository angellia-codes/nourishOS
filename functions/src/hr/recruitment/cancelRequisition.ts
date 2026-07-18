import { onCall } from 'firebase-functions/v2/https'
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
  PERMISSIONS,
} from '../../lib'

// employee-requisition.md §7 — cancel a requisition. v1 covers the states with
// no live approval to unwind: draft/returnedForRevision (owner or manage) and
// approved (manage only — headcount no longer needed, §6). Cancelling a
// pendingApproval requisition would also have to cancel the in-flight approval
// request; the Approval Engine exposes no internal cancel, so that path is
// deferred — reject the chain instead. `completed` can never be cancelled (§6).
export const cancelRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { requisitionId } = (request.data ?? {}) as { requisitionId?: string }
    if (!requisitionId) {
      throw new AppError('invalid-argument', 'requisitionId is required.')
    }

    const requisitionRef = db.collection(COLLECTIONS.RECRUITMENTS).doc(requisitionId)
    const snap = await requisitionRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Requisition not found.')
    }
    const requisition = snap.data()!

    const canManage = user.permissions.includes(PERMISSIONS.RECRUITMENT_MANAGE)
    const isOwner = requisition.requestedBy === user.uid

    if (requisition.status === 'draft' || requisition.status === 'returnedForRevision') {
      if (!isOwner && !canManage) {
        throw new AppError('permission-denied', 'Only the requester or HR can cancel this requisition.')
      }
    } else if (requisition.status === 'approved') {
      if (!canManage) {
        throw new AppError('permission-denied', 'Only HR can cancel an approved requisition.')
      }
    } else {
      throw new AppError('failed-precondition', `A requisition that is ${requisition.status} cannot be cancelled.`)
    }

    await requisitionRef.update({
      status: 'cancelled',
      vacancyStage: null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'RequisitionCancelled',
      category: 'HR',
      module: 'recruitment',
      resourceType: 'requisition',
      resourceId: requisitionId,
      action: 'cancel',
      user,
      previousValues: { status: requisition.status },
    })

    return successResponse({ requisitionId }, 'Requisition cancelled.')
  } catch (error) {
    handleError(error)
  }
})
