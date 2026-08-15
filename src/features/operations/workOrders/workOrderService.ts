import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy, type Unsubscribe } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { WorkOrder, WorkOrderStatus } from '@/types'

export interface CreateWorkOrderInput {
  title: string
  description: string
  location: string
  priority: Priority
}

export function createWorkOrder(input: CreateWorkOrderInput): Promise<{ workOrderId: string }> {
  return callFunction('createWorkOrder', input)
}

export function updateWorkOrderStatus(input: {
  workOrderId: string
  status: WorkOrderStatus
  assignedTo?: string
  resolutionNotes?: string
}): Promise<{ workOrderId: string }> {
  return callFunction('updateWorkOrderStatus', input)
}

export function getWorkOrder(workOrderId: string): Promise<WorkOrder | null> {
  return getDocument<WorkOrder>(COLLECTIONS.WORK_ORDERS, workOrderId)
}

export function subscribeToWorkOrders(
  onChange: (rows: WorkOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<WorkOrder>(COLLECTIONS.WORK_ORDERS, [orderBy('createdAt', 'desc')], onChange, onError)
}
