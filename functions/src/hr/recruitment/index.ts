import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { createTaskInternal } from '../../shared/tasks'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'

export { createRequisition } from './createRequisition'
export { submitRequisition } from './submitRequisition'
export { cancelRequisition } from './cancelRequisition'

/**
 * employee-requisition.md §6 — when the 'hr/requisition' route resolves, mirror
 * the outcome onto the requisition doc (AC-1, AC-4). Approved → status=approved,
 * vacancyStage='open' (the doc can't be "open" before approval, §2), an HR task
 * to open the vacancy, and notifications to the requester + HR. Rejected →
 * status=rejected and notify the requester (reason lives in the approval history).
 */
registerApprovalResolvedHandler('requisition', async (event) => {
  const requisitionRef = db.collection(COLLECTIONS.RECRUITMENTS).doc(event.resourceId)
  const snap = await requisitionRef.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing requisition ${event.resourceId}`)
    return
  }
  const requisition = snap.data()!
  const approved = event.newStatus === 'approved'

  await requisitionRef.update({
    status: event.newStatus, // 'approved' | 'rejected'
    vacancyStage: approved ? 'open' : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await sendNotificationInternal({
    type: 'alert',
    title: approved ? 'Requisition Approved' : 'Requisition Rejected',
    message: approved
      ? `Requisition ${requisition.requisitionNumber} was approved — the vacancy is now open.`
      : `Requisition ${requisition.requisitionNumber} was rejected. See the approval history for the reason.`,
    module: 'recruitment',
    priority: 'medium',
    recipientUid: requisition.requestedBy,
    referenceModule: 'recruitment',
    referenceId: event.resourceId,
  })

  if (!approved) return

  // Auto-task to HR to open the vacancy (§6). Assigned to active HR Managers;
  // if none exist yet, the notification below still reaches HR.
  const hrSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', 'hrManager')
    .where('status', '==', 'active')
    .get()
  const hrUids = hrSnap.docs.map((d) => d.id)
  if (hrUids.length > 0) {
    await createTaskInternal({
      title: `Open vacancy ${requisition.requisitionNumber}`,
      description: `${requisition.openings} opening(s) approved. Open the vacancy and begin sourcing.`,
      taskType: 'recruitment',
      sourceModule: 'recruitment',
      referenceId: event.resourceId,
      assignedTo: hrUids,
      assignedBy: 'system:approvalEngine',
      priority: requisition.urgency === 'critical' ? 'critical' : requisition.urgency === 'urgent' ? 'high' : 'medium',
      tags: ['requisition'],
    })
  }

  await notifyUsersByRole({
    role: 'hrManager',
    module: 'recruitment',
    title: 'Requisition Ready to Open',
    message: `${requisition.requisitionNumber} is approved — ${requisition.openings} opening(s) to fill.`,
    referenceId: event.resourceId,
  })
})
