import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'

export { createEquipment } from './createEquipment'
export { updateEquipment } from './updateEquipment'
export { updateEquipmentStatus } from './updateEquipmentStatus'
export { transferEquipmentOutlet } from './transferEquipmentOutlet'
export { requestEquipmentDecommission } from './requestEquipmentDecommission'
export { previewEquipmentImport } from './previewEquipmentImport'
export { commitEquipmentImport } from './commitEquipmentImport'

/**
 * equipment-master-design.md §5.1/§7 `onEquipmentDecommissionResolved` —
 * module-load-time registration (shared/approval/registry.ts), same shape as
 * finance/index.ts's 'expenseRequest' handler. Runs in onApprovalRequestResolved,
 * a Firestore trigger that fires after the engine's own transaction commits,
 * not inside it.
 */
registerApprovalResolvedHandler('equipmentDecommission', async (event) => {
  const ref = db.collection(COLLECTIONS.EQUIPMENT).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing equipment ${event.resourceId}`)
    return
  }
  const equipment = snap.data()!
  const approved = event.newStatus === 'approved'

  // §3.2's decommissionedBy is who approved it, not who requested it — the
  // resolved event itself carries no uid, so the approvalHistory trail is the
  // source. Reuses the existing approvalRequestId+timestamp(asc) index
  // (same one approvalService.getApprovalHistory exposes to the client) —
  // a single-step route has exactly one entry, the final 'approve'.
  let decommissionedBy: string | null = null
  if (approved) {
    const historySnap = await db
      .collection(COLLECTIONS.APPROVAL_HISTORY)
      .where('approvalRequestId', '==', event.approvalRequestId)
      .orderBy('timestamp', 'asc')
      .get()
    const lastApproval = [...historySnap.docs].reverse().find((doc) => doc.data().action?.startsWith('approve'))
    decommissionedBy = (lastApproval?.data().approverUid as string | undefined) ?? null
  }

  await ref.update({
    status: approved ? 'decommissioned' : equipment.status,
    decommissionedAt: approved ? FieldValue.serverTimestamp() : null,
    decommissionedBy,
    // A rejected request clears the pending markers so the asset can be
    // resubmitted later — §5.1 names no other consequence for a rejection.
    decommissionApprovalRequestId: approved ? equipment.decommissionApprovalRequestId : null,
    decommissionReason: approved ? equipment.decommissionReason : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  const requestSnap = await db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc(event.approvalRequestId).get()
  const requestedBy = requestSnap.data()?.requestedBy as string | undefined
  if (requestedBy) {
    await sendNotificationInternal({
      type: 'alert',
      title: approved ? 'Equipment decommissioned' : 'Decommission request rejected',
      message: approved
        ? `${equipment.assetCode as string} has been decommissioned and dropped from active scheduling.`
        : `The decommission request for ${equipment.assetCode as string} was rejected. See the approval history for the reason.`,
      module: 'operations',
      priority: 'medium',
      recipientUid: requestedBy,
      referenceModule: 'operations',
      referenceId: event.resourceId,
      actionUrl: `/engineering/assets/${event.resourceId}`,
    })
  }
})
