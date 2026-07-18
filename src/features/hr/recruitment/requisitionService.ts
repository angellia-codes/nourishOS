import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Requisition, EmploymentType, RequisitionType, Urgency } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateRequisitionInput {
  positionId: string | null
  positionTitleFallback?: string
  openings: number
  employmentType: EmploymentType
  contractMonths?: number
  requisitionType: RequisitionType
  replacingEmployeeId?: string
  targetJoinDate: string
  urgency: Urgency
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
}

export function createRequisition(input: CreateRequisitionInput): Promise<{ requisitionId: string }> {
  return callFunction('createRequisition', input)
}

export function submitRequisition(requisitionId: string): Promise<{ approvalRequestId: string; requisitionNumber: string }> {
  return callFunction('submitRequisition', { requisitionId })
}

export function cancelRequisition(requisitionId: string): Promise<{ requisitionId: string }> {
  return callFunction('cancelRequisition', { requisitionId })
}

export function subscribeToRequisitions(onChange: (requisitions: Requisition[]) => void): Unsubscribe {
  return subscribeToCollection<Requisition>(
    COLLECTIONS.RECRUITMENTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}
