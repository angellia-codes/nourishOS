import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS, updatedFields } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'
import { PAYROLL_WRITE_CHUNK_SIZE } from '../../lib/payroll'

export { parsePayrollCsv } from './parsePayrollCsv'
export { createPayrollBatch } from './createPayrollBatch'
export { submitPayrollBatch } from './submitPayrollBatch'
export { supersedePayslip } from './supersedePayslip'
export { upsertPayrollComponent, seedPayrollComponents } from './upsertPayrollComponent'
export { upsertPayrollParameters } from './upsertPayrollParameters'
export { recordMonthlyRevenue } from './recordMonthlyRevenue'
export { getManningCostSummary } from './getManningCostSummary'

const SYSTEM_ACTOR = 'system:approvalEngine'

/**
 * payroll-components-payslip-design.md §6.1 — resolution of the
 * 'hr/payrollBatch' chain is what publishes a month.
 *
 * On approval every payslip in the batch is stamped with `issuedAt`, and that
 * stamp is exactly what firestore.rules reads to allow the read: before it,
 * the documents exist but no role can see them. Doing it this way rather than
 * a rules-side `get()` on the parent batch keeps rule evaluation to zero extra
 * document reads per payslip.
 *
 * On rejection the batch is marked `rejected` and the payslips are left
 * unissued — unreadable, and available for HR to correct and resubmit rather
 * than deleted, so the rejected attempt stays in the record.
 */
registerApprovalResolvedHandler('payrollBatch', async (event) => {
  const ref = db.collection(COLLECTIONS.PAYROLL_BATCHES).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing payroll batch ${event.resourceId}`)
    return
  }
  const batch = snap.data()!

  if (event.newStatus === 'approved') {
    const issued = await stampIssuedAt(event.resourceId)
    await ref.update({
      status: 'approved',
      ...updatedFields(SYSTEM_ACTOR),
    })
    logger.info(`Payroll batch ${event.resourceId} approved — ${issued} payslip(s) issued.`)
  } else {
    await ref.update({
      status: 'rejected',
      ...updatedFields(SYSTEM_ACTOR),
    })
  }

  const requestedBy = batch.createdBy as string | undefined
  if (requestedBy) {
    await sendNotificationInternal({
      type: event.newStatus === 'approved' ? 'PayrollBatchApproved' : 'PayrollBatchRejected',
      title: event.newStatus === 'approved' ? 'Payroll approved' : 'Payroll rejected',
      message:
        event.newStatus === 'approved'
          ? `Payroll for ${batch.period} is approved. Payslips are now readable.`
          : `Payroll for ${batch.period} was rejected. Correct the file and resubmit.`,
      module: 'hr',
      priority: 'high',
      recipientUid: requestedBy,
      referenceModule: 'hr',
      referenceId: event.resourceId,
      actionUrl: `/hr/payroll/batches/${event.resourceId}`,
    })
  }
})

/** §6.5 — chunked at 400, same as the import write. */
async function stampIssuedAt(batchId: string): Promise<number> {
  const snap = await db.collection(COLLECTIONS.PAYSLIPS).where('batchId', '==', batchId).get()

  for (let offset = 0; offset < snap.docs.length; offset += PAYROLL_WRITE_CHUNK_SIZE) {
    const chunk = snap.docs.slice(offset, offset + PAYROLL_WRITE_CHUNK_SIZE)
    const writeBatch = db.batch()
    for (const doc of chunk) {
      // A superseding correction is issued on creation; never re-stamp it.
      if (doc.data().issuedAt) continue
      writeBatch.update(doc.ref, {
        issuedAt: FieldValue.serverTimestamp(),
        isIssued: true,
        ...updatedFields(SYSTEM_ACTOR),
      })
    }
    await writeBatch.commit()
  }

  return snap.docs.length
}
