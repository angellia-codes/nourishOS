import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'
import { notifyEmployeeOfRelease } from './disciplinaryRecords'

export { createEmployee } from './createEmployee'
export { updateEmployee } from './updateEmployee'
export { updateEmployeeCompensation } from './updateEmployeeCompensation'
export { archiveEmployee, unarchiveEmployee } from './archiveEmployee'
export { importEmployees } from './importEmployees'
export { getEmployeeAuditLog } from './getEmployeeAuditLog'
export { contractAlerts } from './contractAlerts'
export {
  createDisciplinaryRecord,
  updateDisciplinaryRecord,
  submitCommunicationRecord,
  submitEmployeeStatement,
  acknowledgeCommunicationRecord,
  addInvestigationNote,
  closeDisciplinaryRecord,
} from './disciplinaryRecords'
export { expireCommunicationRecords } from './communicationExpiry'
export { updateOffboardingItem, completeOffboarding } from './offboarding'
export { submitExitInterview, getExitInterviewInsights } from './exitInterview'

/**
 * employee_communication.md §6/§17 — the hand-off between the approval chain and
 * the employee acknowledgement stage, which the Approval Engine cannot own
 * because its steps are keyed by role and the only role a floor employee holds
 * is `staff` (see communicationSteps.ts).
 *
 * Approved means all three signatures are in, so the record is released to the
 * employee: `releasedToEmployee` is what firestore.rules checks before letting
 * them read it (§5.5 "when released").
 *
 * Rejected sends it back to `draft` so the author can correct and resubmit,
 * rather than dead-ending — the same shape as hr/contracts' signing handler.
 * `returnForRevision` is deliberately unused: shared/approval dispatches only
 * approved/rejected.
 */
registerApprovalResolvedHandler('employeeCommunication', async (event) => {
  const ref = db.collection(COLLECTIONS.DISCIPLINARY_ACTIONS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing communication record ${event.resourceId}`)
    return
  }
  const record = snap.data()!
  const approved = event.newStatus === 'approved'

  await ref.update({
    status: approved ? 'pendingEmployee' : 'draft',
    releasedToEmployee: approved,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  if (approved) {
    await notifyEmployeeOfRelease(event.resourceId, {
      employeeUid: (record.employeeUid as string | null) ?? null,
      employeeName: (record.employeeName as string | null) ?? null,
      type: record.type as string,
    })
    return
  }

  await sendNotificationInternal({
    type: 'alert',
    title: 'Communication Returned',
    message: `The ${record.type as string} record for ${(record.employeeName as string | null) ?? 'an employee'} was not approved. See the approval history for the reason, then correct and resubmit it.`,
    module: 'hr',
    priority: 'high',
    recipientUid: record.createdBy as string,
    referenceModule: 'hr',
    referenceId: event.resourceId,
    actionUrl: `/communications/employee/${event.resourceId}`,
  })
})
