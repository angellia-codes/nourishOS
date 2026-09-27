import type { BaseDocument } from './firestore.types'
import type { ContractType } from '@/constants/hr'

/**
 * HR.md §9 Employment Contracts — one row per contract version per employee
 * (append-only history). Employee.contractType/contractStartDate/contractEndDate
 * stay as a denormalized "current contract" cache updated in lockstep by
 * renewContract/terminateContract; this collection is the permanent record of
 * every change, which the flat fields alone never captured.
 */
export interface Contract extends BaseDocument {
  employeeId: string
  contractType: ContractType
  contractStartDate: string
  contractEndDate?: string | null
  /** 1, 2, 3… per employee — the row's position in that employee's history. */
  version: number
  status: 'active' | 'superseded' | 'terminated'
  terminationReason?: string
  terminatedAt?: string

  /**
   * HR_OPERATIONS.md §9.14 New Contract Signing. Absent on contracts created
   * before signing existed and on any contract never sent for signature —
   * treat missing as 'unsigned'. The approval trail (approver identity +
   * timestamp in approvalHistory, plus a captured signature image on the
   * GM/Director steps — ApprovalHistoryEntry.signatureFileId) remains the
   * audit record; `signedFileId` itself is never modified.
   */
  signingStatus?: 'unsigned' | 'pending' | 'signed'
  signingApprovalRequestId?: string | null
  /** files/{id} of the PDF that went out for signing — never modified. */
  signedFileId?: string | null
  signedAt?: string | null
  /**
   * files/{id} of the generated "fully signed" PDF — the GM's and Director's
   * actually-captured signatures stamped into the original document (the
   * initial-box footer on every page, plus the bilingual signature block).
   * Set once, by the 'hr/contractSigning' resolved handler
   * (generateSignedContract.ts), only after the chain fully approves.
   * Absent if generation failed (HR is notified to assemble it manually) or
   * hasn't run yet.
   */
  fullySignedFileId?: string | null
}
