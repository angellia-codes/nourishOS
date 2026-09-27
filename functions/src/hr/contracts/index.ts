import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { notifyUsersByRole } from '../../shared/notifications'
import { generateSignedContractPdf } from './generateSignedContract'

export { renewContract } from './renewContract'
export { terminateContract } from './terminateContract'
export { submitContractForSigning } from './signing'

/**
 * Module-load-time registration: when the 'hr/contractSigning' route resolves,
 * mirror the outcome onto the contract — HR_OPERATIONS.md §9.14 row 4, "HR
 * downloads the fully signed PDF". Same shape as the requisition and project
 * handlers. Rejection sends it back to `unsigned` so HR can re-upload and
 * resubmit rather than being stuck with a dead-end record.
 */
registerApprovalResolvedHandler('contractSigning', async (event) => {
  const ref = db.collection(COLLECTIONS.CONTRACTS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing contract ${event.resourceId}`)
    return
  }
  const contract = snap.data()!
  const signed = event.newStatus === 'approved'

  await ref.update({
    signingStatus: signed ? 'signed' : 'unsigned',
    signedAt: signed ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  await notifyUsersByRole({
    role: 'hrManager',
    module: 'hr',
    title: signed ? 'Contract Fully Signed' : 'Contract Signing Rejected',
    message: signed
      ? `The contract for employee ${contract.employeeId as string} is signed by the GM and Director.`
      : `The contract for employee ${contract.employeeId as string} was not signed. Review and resubmit.`,
    referenceId: event.resourceId,
    priority: 'high',
  })

  // Best-effort — stamping happens after the approval has already resolved,
  // so a failure here must never leave the contract stuck: log it and tell
  // HR to assemble the signed PDF by hand, rather than throwing back into
  // the approval engine's own resolved-handler dispatch.
  if (signed) {
    try {
      await generateSignedContractPdf(event.resourceId)
    } catch (error) {
      logger.error(`Could not generate the fully signed PDF for contract ${event.resourceId}`, error)
      await notifyUsersByRole({
        role: 'hrManager',
        module: 'hr',
        title: 'Fully Signed PDF Needs Manual Review',
        message: `The contract for employee ${contract.employeeId as string} is signed, but the stamped PDF could not be generated automatically. Assemble it manually.`,
        referenceId: event.resourceId,
        priority: 'high',
      })
    }
  }
})
