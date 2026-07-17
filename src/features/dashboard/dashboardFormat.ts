import type { ApprovalStatus, DemoRole, TaskPriority, TaskStatus } from './dashboardDemoData'

/** dashboard.md §15 Dashboard by Role — display labels for the role switcher. */
export const ROLE_LABELS: Record<DemoRole, string> = {
  superAdmin: 'Super Admin',
  director: 'Director',
  generalManager: 'General Manager',
  hrManager: 'HR Manager',
  finance: 'Finance',
  kitchenLeader: 'Kitchen Leader',
  barLeader: 'Bar Leader',
  floorLeader: 'Floor Leader',
  engineering: 'Engineering',
  security: 'Security',
}

export const APPROVAL_STATUS_VARIANT: Record<ApprovalStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, 'info' | 'warning' | 'error'> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  notStarted: 'Not started',
  inProgress: 'In progress',
  done: 'Done',
}

export function formatDashboardDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
