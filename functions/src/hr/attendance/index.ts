import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, updatedFields } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'

export { previewAttendanceImport } from './previewAttendanceImport'
export { importAttendancePeriod } from './importAttendancePeriod'
export { submitAttendancePeriod } from './submitAttendancePeriod'
export { remindAttendanceImport } from './reminder'

const SYSTEM_ACTOR = 'system:approvalEngine'
/** Firestore caps a batch at 500 writes; headroom for a future >400-record period. */
const STAMP_CHUNK_SIZE = 400

/**
 * attendance.md §6.1 — resolution of the 'people/attendancePeriod' chain is
 * what makes a period's records readable. Mirrors
 * functions/src/hr/payroll/index.ts's payrollBatch handler.
 *
 * On approval every record in the period is stamped `isApproved: true`, and
 * that stamp is exactly what firestore.rules reads to allow the read — see
 * the isIssued precedent's own reasoning on Payslip.
 *
 * On rejection the period is marked `rejected` and its records are left
 * unapproved — unreadable, and available for HR to resubmit rather than
 * deleted, so the rejected attempt stays in the record.
 */
registerApprovalResolvedHandler('attendancePeriod', async (event) => {
  const ref = db.collection(COLLECTIONS.ATTENDANCE_PERIODS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing attendance period ${event.resourceId}`)
    return
  }
  const period = snap.data()!

  if (event.newStatus === 'approved') {
    const approved = await stampApproved(event.resourceId)
    await ref.update({ status: 'approved', ...updatedFields(SYSTEM_ACTOR) })
    logger.info(`Attendance period ${event.resourceId} approved — ${approved} record(s) now readable.`)
  } else {
    await ref.update({ status: 'rejected', ...updatedFields(SYSTEM_ACTOR) })
  }

  const requestedBy = period.createdBy as string | undefined
  if (requestedBy) {
    await sendNotificationInternal({
      type: event.newStatus === 'approved' ? 'AttendancePeriodApproved' : 'AttendancePeriodRejected',
      title: event.newStatus === 'approved' ? 'Attendance approved' : 'Attendance rejected',
      message:
        event.newStatus === 'approved'
          ? `Attendance for ${period.period as string} is approved and now readable.`
          : `Attendance for ${period.period as string} was rejected. Review and resubmit.`,
      module: 'hr',
      priority: 'high',
      recipientUid: requestedBy,
      referenceModule: 'hr',
      referenceId: event.resourceId,
      actionUrl: `/hr/attendance/periods/${event.resourceId}`,
    })
  }
})

async function stampApproved(periodId: string): Promise<number> {
  const snap = await db.collection(COLLECTIONS.ATTENDANCE_RECORDS).where('periodId', '==', periodId).get()

  for (let offset = 0; offset < snap.docs.length; offset += STAMP_CHUNK_SIZE) {
    const chunk = snap.docs.slice(offset, offset + STAMP_CHUNK_SIZE)
    const batch = db.batch()
    for (const doc of chunk) {
      batch.update(doc.ref, { isApproved: true, ...updatedFields(SYSTEM_ACTOR) })
    }
    await batch.commit()
  }

  return snap.docs.length
}
