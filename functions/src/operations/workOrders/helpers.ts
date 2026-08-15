export type WorkOrderStatus = 'open' | 'assigned' | 'inProgress' | 'completed' | 'closed'
export type WorkOrderPriority = 'critical' | 'high' | 'medium' | 'low'

/** Forward-only lifecycle — FEATURE_SPECIFICATIONS.md Module 5: Request → Assign → In Progress → Completed → Closed. */
export const WORK_ORDER_NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  open: 'assigned',
  assigned: 'inProgress',
  inProgress: 'completed',
  completed: 'closed',
}
