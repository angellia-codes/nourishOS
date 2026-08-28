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

/**
 * equipment-master-design.md §5.1/§5.2 — the one gated transition. Submits
 * the 'operations/equipmentDecommission' route (single step, the asset's own
 * outlet manager — approvalSteps.ts), a status change deliberately kept
 * pending until resolved: onEquipmentDecommissionResolved.ts is what actually
 * flips `status` to 'decommissioned'.
 */
export const requestEquipmentDecommission = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_DECOMMISSION)

    const { equipmentId, reason } = (request.data ?? {}) as { equipmentId?: string; reason?: string }
    const id = typeof equipmentId === 'string' ? equipmentId.trim() : ''
    const decommissionReason = typeof reason === 'string' ? reason.trim() : ''
    if (!id || !decommissionReason) {
      throw new AppError('invalid-argument', 'equipmentId and reason are required.')
    }

    const ref = db.collection(COLLECTIONS.EQUIPMENT).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That equipment no longer exists.')
    }
    const previous = snap.data()!
    if (previous.status === 'decommissioned') {
      throw new AppError('failed-precondition', 'That equipment has already been decommissioned.')
    }
    if (previous.decommissionApprovalRequestId) {
      throw new AppError('failed-precondition', 'A decommission request for this asset is already pending.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'operations',
      resourceType: 'equipmentDecommission',
      resourceId: id,
      requestedBy: user.uid,
      context: { outletId: previous.outletId as string },
    })

    await ref.update({
      decommissionApprovalRequestId: approvalRequestId,
      decommissionReason,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'EquipmentDecommissionRequested',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: id,
      action: 'submit',
      user,
      newValues: { approvalRequestId, reason: decommissionReason },
    })

    return successResponse(
      { equipmentId: id, approvalRequestId },
      `Sent ${previous.assetCode as string} to the outlet manager for decommission approval.`,
    )
  } catch (error) {
    return handleError(error)
  }
})
