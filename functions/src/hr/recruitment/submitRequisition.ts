import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { submitApprovalInternal } from '../../shared/approval'
import { allocateRequisitionNumber } from './helpers'

// employee-requisition.md §7 — submit allocates the requisition number and
// invokes the Approval Engine. It builds no steps of its own: the route
// (budgeted-conditional, Dept Leader → HR → GM [→ Director]) is server-owned in
// shared/approval/routes.ts. Only the requester may submit their own draft.
export const submitRequisition = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.RECRUITMENT_CREATE)

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

    if (requisition.requestedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the requester can submit this requisition.')
    }
    if (requisition.status !== 'draft' && requisition.status !== 'returnedForRevision') {
      throw new AppError('failed-precondition', `This requisition is already ${requisition.status}.`)
    }

    // Allocate the number only once (a returned-for-revision resubmit keeps its number).
    const requisitionNumber = requisition.requisitionNumber ?? (await allocateRequisitionNumber())

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'requisition',
      resourceId: requisitionId,
      requestedBy: user.uid,
      priority: requisition.urgency === 'critical' ? 'critical' : requisition.urgency === 'urgent' ? 'high' : 'medium',
      context: {
        budgeted: requisition.budgeted,
        outletId: requisition.outletId,
        departmentId: requisition.departmentId,
        requestedByRole: user.roleId,
      },
    })

    await requisitionRef.update({
      requisitionNumber,
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'RequisitionSubmitted',
      category: 'HR',
      module: 'recruitment',
      resourceType: 'requisition',
      resourceId: requisitionId,
      action: 'submit',
      user,
      newValues: { requisitionNumber, approvalRequestId, budgeted: requisition.budgeted },
    })

    return successResponse({ approvalRequestId, requisitionNumber }, 'Requisition submitted for approval.')
  } catch (error) {
    handleError(error)
  }
})
