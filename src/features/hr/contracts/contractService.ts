import { callFunction } from '@/services/api'
import { queryDocuments, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Contract } from '@/types'
import type { ContractType } from '@/constants/hr'

export function renewContract(input: {
  employeeId: string
  contractType: ContractType
  contractStartDate: string
  contractEndDate?: string
}): Promise<{ contractId: string }> {
  return callFunction('renewContract', input)
}

export function terminateContract(input: {
  employeeId: string
  terminationReason: string
}): Promise<{ contractId: string }> {
  return callFunction('terminateContract', input)
}

/**
 * HR_OPERATIONS.md §9.14 — routes an already-uploaded contract PDF into the
 * HR → GM → Director signing chain. The upload itself is the profile page's
 * existing "Contract Document" card (resourceType 'employeeContract').
 */
export function submitContractForSigning(input: {
  contractId: string
  fileId: string
}): Promise<{ contractId: string; approvalRequestId: string }> {
  return callFunction('submitContractForSigning', input)
}

/** One-shot — the profile page's "Contract History" card doesn't need a live listener. */
export function listContractsForEmployee(employeeId: string): Promise<Contract[]> {
  return queryDocuments<Contract>(COLLECTIONS.CONTRACTS, [
    where('employeeId', '==', employeeId),
    orderBy('version', 'desc'),
  ])
}
