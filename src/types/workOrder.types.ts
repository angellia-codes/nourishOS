import type { BaseDocument } from './firestore.types'
import type { Priority } from '@/constants/statuses'

/** FEATURE_SPECIFICATIONS.md Module 5 — Request → Assign → In Progress → Completed → Closed. */
export type WorkOrderStatus = 'open' | 'assigned' | 'inProgress' | 'completed' | 'closed'

export interface WorkOrder extends BaseDocument {
  title: string
  description: string
  location: string
  priority: Priority
  assignedToRole: string
  assignedTo: string | null
  resolutionNotes: string | null
  sourceIncidentId: string | null
  status: WorkOrderStatus
}
