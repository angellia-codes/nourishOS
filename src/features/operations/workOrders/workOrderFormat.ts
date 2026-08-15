import { Inbox, UserCheck, Wrench, CheckCheck, Lock, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import type { Priority } from '@/constants/statuses'
import type { WorkOrderStatus } from '@/types'

/** FEATURE_SPECIFICATIONS.md Module 5 — Request → Assign → In Progress → Completed → Closed. */
export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  inProgress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
}

export const WORK_ORDER_STATUS_TONE: Record<WorkOrderStatus, StatusTone> = {
  open: 'info',
  assigned: 'warning',
  inProgress: 'warning',
  completed: 'success',
  closed: 'closed',
}

export const WORK_ORDER_STATUS_ICON: Record<WorkOrderStatus, LucideIcon> = {
  open: Inbox,
  assigned: UserCheck,
  inProgress: Wrench,
  completed: CheckCheck,
  closed: Lock,
}

export const WORK_ORDER_PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const WORK_ORDER_PRIORITY_VARIANT: Record<Priority, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}
