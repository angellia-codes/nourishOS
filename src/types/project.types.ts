import type { BaseDocument } from './firestore.types'
import type { Priority } from '@/constants/statuses'

/** HR_OPERATIONS.md §9.8 Kanban columns. */
export type ProjectColumn = 'backlog' | 'todo' | 'inProgress' | 'review' | 'completed'

/** draft → pending_approval → active (on the board) → completed, or rejected/cancelled. */
export type ProjectStatus = 'draft' | 'pending_approval' | 'active' | 'completed' | 'rejected' | 'cancelled'

/** Embedded on the project rather than its own collection — a milestone has no lifecycle of its own. */
export interface ProjectMilestone {
  title: string
  dueDate: string
  completed: boolean
}

export interface Project extends BaseDocument {
  name: string
  objective: string
  startDate: string
  targetDate: string
  priority: Priority
  outletId: string
  departmentId: string
  ownerUid: string
  column: ProjectColumn
  milestones: ProjectMilestone[]
  approvalRequestId: string | null
  completedAt: string | null
  status: ProjectStatus
}
