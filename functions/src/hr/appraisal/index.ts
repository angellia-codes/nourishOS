import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS, type AuthedUser } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'
import { recordEmployeeActivity } from '../employees/helpers'

export { createAppraisal } from './createAppraisal'
export { submitAppraisal } from './submitAppraisal'
export { seedAppraisalTemplates } from './seedAppraisalTemplates'
export { generateAppraisalInsights } from './generateAppraisalInsights'
export { triggerProbationReviews } from './probationReviewTrigger'

/** Approval resolution has no human caller — same synthetic-user shape as probationReviewTrigger.ts's SYSTEM_USER. */
const SYSTEM_USER: AuthedUser = {
  uid: 'system:approvalEngine',
  email: null,
  displayName: 'System (Approval Engine)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
}

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

  if (event.newStatus === 'approved') {
    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(appraisal.employeeId as string).get()
    if (employeeSnap.exists) {
      const employee = employeeSnap.data()!
      await recordEmployeeActivity(
        { id: employeeSnap.id, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
        'appraisalCompleted',
        `Performance review completed (${appraisal.periodLabel as string}).`,
        SYSTEM_USER,
      )
    }
  }

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
