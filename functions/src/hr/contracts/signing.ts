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
 * New Contract Signing — HR_OPERATIONS.md §9.14.
 *
 * The PDF itself is already handled: the employee profile's "Contract Document"
 * card uploads it through the existing File Storage Service
 * (`resourceType: 'employeeContract'`), so this callable only routes an
 * already-uploaded contract version into the §9.10 "Contract Signing" chain
 * (HR Manager → General Manager → Director, `shared/approval/routes.ts`).
 *
 * ponytail: the "digital signature" is the approval record itself — approver
 * identity, timestamp and comment captured by `approveStep` in approvalHistory.
 * There is no signature-capture canvas and no signed-PDF generation, so what is
 * stored is an auditable approval trail rather than a cryptographically signed
 * document. If a signed artifact is ever legally required, that is a PDF
 * pipeline (no PDF library exists anywhere in this app today), not a change to
 * this flow.
 */
export const submitContractForSigning = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    // Raising the request stays with whoever maintains the employee record;
    // contracts.sign gates the GM/Director signature steps themselves, which
    // the Approval Engine enforces by approverRole.
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE)

    const { contractId, fileId } = (request.data ?? {}) as { contractId?: string; fileId?: string }
    const id = String(contractId ?? '').trim()
    if (!id) {
      throw new AppError('invalid-argument', 'contractId is required.')
    }
    if (!fileId) {
      // §9.14 row 1: HR uploads the PDF first. Without it the GM would be
      // asked to sign nothing.
      throw new AppError('invalid-argument', 'Upload the contract PDF before sending it for signing.')
    }

    const ref = db.collection(COLLECTIONS.CONTRACTS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That contract no longer exists.')
    }
    const contract = snap.data()!

    if (contract.signingStatus === 'pending') {
      throw new AppError('failed-precondition', 'That contract is already out for signing.')
    }
    if (contract.signingStatus === 'signed') {
      throw new AppError('failed-precondition', 'That contract has already been signed.')
    }

    const fileSnap = await db.collection(COLLECTIONS.FILES).doc(fileId).get()
    if (!fileSnap.exists || fileSnap.data()?.fileStatus !== 'available') {
      throw new AppError('invalid-argument', 'That contract file no longer exists.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'contractSigning',
      resourceId: id,
      requestedBy: user.uid,
      priority: 'high',
    })

    await ref.update({
      signingStatus: 'pending',
      signingApprovalRequestId: approvalRequestId,
      signedFileId: fileId,
      signedAt: null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ContractSubmittedForSigning',
      category: 'HR',
      module: 'hr',
      resourceType: 'contract',
      resourceId: id,
      action: 'submit',
      user,
      newValues: { approvalRequestId, fileId, employeeId: contract.employeeId },
    })

    return successResponse({ contractId: id, approvalRequestId }, 'Sent to the General Manager for signing.')
  } catch (error) {
    handleError(error)
  }
})
