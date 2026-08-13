import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'

export { createAppraisal } from './createAppraisal'
export { submitAppraisal } from './submitAppraisal'
export { seedAppraisalTemplates } from './seedAppraisalTemplates'
export { generateAppraisalInsights } from './generateAppraisalInsights'

/**
 * Module-load-time registration (see shared/approval/registry.ts): when the
 * 'hr/appraisal' approval route resolves, mirror the outcome onto the
 * appraisal doc and tell the reviewer. Keeps the Approval Engine generic —
 * it never imports HR code; it dispatches here by resourceType string.
 */
registerApprovalResolvedHandler('appraisal', async (event) => {
  const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc(event.resourceId)
  const appraisalSnap = await appraisalRef.get()
  if (!appraisalSnap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing appraisal ${event.resourceId}`)
    return
  }
  const appraisal = appraisalSnap.data()!

  await appraisalRef.update({
    status: event.newStatus, // 'approved' | 'rejected'
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await sendNotificationInternal({
    type: 'alert',
    title: event.newStatus === 'approved' ? 'Appraisal Approved' : 'Appraisal Rejected',
    message:
      event.newStatus === 'approved'
        ? `The appraisal you submitted (${appraisal.periodLabel}) has been fully approved.`
        : `The appraisal you submitted (${appraisal.periodLabel}) was rejected. See the approval history for the reason.`,
    module: 'hr',
    priority: 'medium',
    recipientUid: appraisal.reviewerId,
    referenceModule: 'hr',
    referenceId: event.resourceId,
  })
})
