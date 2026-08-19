import type { BaseDocument } from './firestore.types'
import type { Priority } from '@/constants/statuses'

/** FEATURE_SPECIFICATIONS.md Module 5 — Request → Assign → In Progress → Completed → Closed. */
export type WorkOrderStatus = 'open' | 'assigned' | 'inProgress' | 'completed' | 'closed'

/** One entry of the running log an engineer keeps while the job is open. */
export interface WorkOrderProgressNote {
  note: string
  by: string
  at: string
}

export interface WorkOrder extends BaseDocument {
  title: string
  description: string
  location: string
  priority: Priority
  outletId: string
  departmentId: string
  assignedToRole: string
  assignedTo: string | null
  progressNotes: WorkOrderProgressNote[]
  resolutionNotes: string | null
  /** 0 until checkWorkOrderEscalations raises it: 1 = engineering notified, 2 = GM notified. */
  escalationLevel: number
  sourceIncidentId: string | null
  status: WorkOrderStatus
}
