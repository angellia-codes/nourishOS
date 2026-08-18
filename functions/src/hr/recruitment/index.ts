import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { createTaskInternal } from '../../shared/tasks'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'

export { createRequisition, updateRequisition, submitRequisition, cancelRequisition } from './requisitions'
export { updateRequisitionCompensation } from './requisitionCompensation'
export { createCandidate, updateCandidate, moveCandidateStage } from './candidates'
export { scheduleInterview, recordInterviewOutcome, cancelInterview } from './interviews'
export { sendInterviewReminders } from './interviewReminders'
export { updateOnboardingItem, completeOnboarding } from './onboarding'

/**
 * Module-load-time registration (shared/approval/registry.ts): when the
 * 'hr/requisition' route resolves, mirror the outcome onto the requisition.
 *
 * This is the only place `vacancyStage` is first set — employee-requisition.md
 * §10 criterion 1 says a requisition cannot reach `open` without a completed
 * approval chain, and routing it through the Approval Engine's own resolution
 * is what makes that true rather than merely intended.
 */
registerApprovalResolvedHandler('requisition', async (event) => {
  const ref = db.collection(COLLECTIONS.RECRUITMENTS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing requisition ${event.resourceId}`)
    return
  }
  const requisition = snap.data()!
  const approved = event.newStatus === 'approved'
  const label = (requisition.requisitionNumber as string | null) ?? 'The requisition'

  await ref.update({
    status: event.newStatus,
    vacancyStage: approved ? 'open' : null,
    approvedAt: approved ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await sendNotificationInternal({
    type: 'alert',
    title: approved ? 'Requisition approved' : 'Requisition rejected',
    message: approved
      ? `${label} is approved. The vacancy is open — candidates can now be added.`
      : `${label} was rejected. See the approval history for the reason.`,
    module: 'hr',
    priority: 'high',
    recipientUid: requisition.createdBy,
    referenceModule: 'hr',
    referenceId: event.resourceId,
  })

  if (!approved) return

  // §6: an approved requisition hands off to HR to actually open the vacancy.
  const hrUsers = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', 'hrManager')
    .where('status', '==', 'active')
    .get()

  if (!hrUsers.empty) {
    await createTaskInternal({
      title: `Open vacancy ${label}`,
      description: `${requisition.openings as number} × ${requisition.position as string}. Target join date ${requisition.targetJoinDate as string}.`,
      taskType: 'recruitment',
      sourceModule: 'hr',
      referenceId: event.resourceId,
      assignedTo: hrUsers.docs.map((doc) => doc.id),
      assignedBy: 'system:approvalEngine',
      priority: requisition.urgency === 'critical' ? 'critical' : 'high',
      dueDate: requisition.targetJoinDate as string,
      tags: ['recruitment', 'vacancy'],
    })
  }

  await notifyUsersByRole({
    role: 'hrManager',
    module: 'hr',
    title: 'Vacancy open',
    message: `${label} — ${requisition.openings as number} × ${requisition.position as string} — is approved and ready to source.`,
    referenceId: event.resourceId,
    priority: 'high',
  })
})
