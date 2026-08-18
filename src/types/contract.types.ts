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
   * treat missing as 'unsigned'. The "signature" is the approval trail
   * (approver identity + timestamp in approvalHistory), not a signed PDF.
   */
  signingStatus?: 'unsigned' | 'pending' | 'signed'
  signingApprovalRequestId?: string | null
  /** files/{id} of the PDF that went out for signing. */
  signedFileId?: string | null
  signedAt?: string | null
}
