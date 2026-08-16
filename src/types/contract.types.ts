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
}
