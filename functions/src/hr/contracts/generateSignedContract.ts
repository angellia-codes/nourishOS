import { getStorage } from 'firebase-admin/storage'
import { db, COLLECTIONS, type AuthedUser } from '../../lib'
import { createFileMetadataInternal } from '../../shared/fileStorage'
import {
  locateInitialBoxes,
  locateSignatureGaps,
  stampContractPdf,
  type SignatureMark,
} from './pdfStamping'

const SYSTEM_USER: AuthedUser = {
  uid: 'system:contractStamping',
  email: null,
  displayName: 'System (Contract Stamping)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
  employeeId: null,
}

/**
 * HR_OPERATIONS.md §9.14 row 4, "HR downloads the fully signed PDF" — the
 * one gap the shipped approval-trail-only Contract Signing flow left open.
 * Called once, from the 'hr/contractSigning' resolved handler, when the
 * chain fully approves. Never called for a rejection — nothing to stamp.
 *
 * This company's real template puts the Director in the footer's column 1
 * and the GM in column 2 (the reverse of the approval sequence, where the GM
 * signs before the Director) — a fact about this specific template, not
 * something derivable from the PDF, hence the explicit map below rather
 * than an inferred one.
 */
const INITIAL_BOX_ROLE_MAP = {
  director: 'director',
  generalManager: 'generalManager',
} as const

/**
 * Best-effort: throws on any failure so the caller (the resolved handler)
 * can log it and notify HR without ever blocking the approval resolution
 * itself, which has already happened by the time this runs.
 */
export async function generateSignedContractPdf(contractId: string): Promise<void> {
  const contractRef = db.collection(COLLECTIONS.CONTRACTS).doc(contractId)
  const contractSnap = await contractRef.get()
  if (!contractSnap.exists) throw new Error(`Contract ${contractId} not found.`)
  const contract = contractSnap.data()!

  const approvalRequestId = contract.signingApprovalRequestId as string | undefined
  const signedFileId = contract.signedFileId as string | undefined
  if (!approvalRequestId || !signedFileId) {
    throw new Error(`Contract ${contractId} has no signing approval request or source file.`)
  }

  const approvalRequestSnap = await db.collection(COLLECTIONS.APPROVAL_REQUESTS).doc(approvalRequestId).get()
  if (!approvalRequestSnap.exists) throw new Error(`Approval request ${approvalRequestId} not found.`)
  const steps = approvalRequestSnap.data()!.steps as { sequence: number; approverRole: string }[]

  const historySnap = await db
    .collection(COLLECTIONS.APPROVAL_HISTORY)
    .where('approvalRequestId', '==', approvalRequestId)
    .get()

  const signaturesByRole = new Map<string, { approverUid: string; signatureFileId: string }>()
  for (const doc of historySnap.docs) {
    const entry = doc.data()
    const signatureFileId = entry.signatureFileId as string | null | undefined
    if (!signatureFileId) continue
    const stepIndex = entry.stepIndex as number
    const approverRole = steps[stepIndex]?.approverRole
    if (approverRole === 'generalManager' || approverRole === 'director') {
      signaturesByRole.set(approverRole, { approverUid: entry.approverUid as string, signatureFileId })
    }
  }

  const directorSig = signaturesByRole.get(INITIAL_BOX_ROLE_MAP.director)
  const gmSig = signaturesByRole.get(INITIAL_BOX_ROLE_MAP.generalManager)
  if (!directorSig || !gmSig) {
    throw new Error(`Contract ${contractId}: missing a captured signature for director and/or generalManager.`)
  }

  const bucket = getStorage().bucket()

  async function resolveNameAndPng(sig: { approverUid: string; signatureFileId: string }) {
    const [userSnap, fileSnap] = await Promise.all([
      db.collection(COLLECTIONS.USERS).doc(sig.approverUid).get(),
      db.collection(COLLECTIONS.FILES).doc(sig.signatureFileId).get(),
    ])
    const name = (userSnap.data()?.displayName as string | undefined) ?? 'Approver'
    const storagePath = fileSnap.data()?.storagePath as string | undefined
    if (!storagePath) throw new Error(`Signature file ${sig.signatureFileId} has no storagePath.`)
    const [pngBytes] = await bucket.file(storagePath).download()
    return { name, pngBytes: new Uint8Array(pngBytes) }
  }

  const [directorInfo, gmInfo, sourceFileSnap] = await Promise.all([
    resolveNameAndPng(directorSig),
    resolveNameAndPng(gmSig),
    db.collection(COLLECTIONS.FILES).doc(signedFileId).get(),
  ])

  const sourceStoragePath = sourceFileSnap.data()?.storagePath as string | undefined
  if (!sourceStoragePath) throw new Error(`Contract source file ${signedFileId} has no storagePath.`)
  const [sourceBytes] = await bucket.file(sourceStoragePath).download()
  const pdfBytes = new Uint8Array(sourceBytes)

  const [initialBoxPages, signatureGap] = await Promise.all([
    locateInitialBoxes(pdfBytes),
    locateSignatureGaps(pdfBytes),
  ])

  const marks: SignatureMark[] = []
  for (const page of initialBoxPages) {
    if (!page) continue // template mismatch on this page — skip it, don't guess
    marks.push({ pageIndex: page.pageIndex, box: page.director, pngBytes: directorInfo.pngBytes, name: directorInfo.name })
    marks.push({ pageIndex: page.pageIndex, box: page.generalManager, pngBytes: gmInfo.pngBytes, name: gmInfo.name })
  }
  if (signatureGap) {
    marks.push(
      { pageIndex: signatureGap.pageIndex, box: signatureGap.director.indo, pngBytes: directorInfo.pngBytes, name: directorInfo.name },
      { pageIndex: signatureGap.pageIndex, box: signatureGap.director.english, pngBytes: directorInfo.pngBytes, name: directorInfo.name },
      { pageIndex: signatureGap.pageIndex, box: signatureGap.generalManager.indo, pngBytes: gmInfo.pngBytes, name: gmInfo.name },
      { pageIndex: signatureGap.pageIndex, box: signatureGap.generalManager.english, pngBytes: gmInfo.pngBytes, name: gmInfo.name },
    )
  }
  if (marks.length === 0) {
    throw new Error(`Contract ${contractId}: could not locate any signature location on the PDF — template mismatch?`)
  }

  const stampedBytes = await stampContractPdf(pdfBytes, marks)

  const timestamp = Date.now()
  const storagePath = `hr/employeeContractSigned/${contractId}/${timestamp}_signed.pdf`
  await bucket.file(storagePath).save(Buffer.from(stampedBytes), { contentType: 'application/pdf', resumable: false })

  const { fileId } = await createFileMetadataInternal(SYSTEM_USER, {
    storagePath,
    fileName: `signed_${contractId}.pdf`,
    mimeType: 'application/pdf',
    fileSizeBytes: stampedBytes.byteLength,
    module: 'hr',
    resourceType: 'employeeContractSigned',
    resourceId: contractId,
  })

  await contractRef.update({ fullySignedFileId: fileId })
}
