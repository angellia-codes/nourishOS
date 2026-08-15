import type { BaseDocument } from './firestore.types'

export type ChecklistType = 'opening' | 'closing'

export interface ChecklistItemStatus {
  completed: boolean
  completedBy: string
  completedAt: string
}

/** One doc per outlet+day (id: `${outletId}__${date}`) — FEATURE_SPECIFICATIONS.md Module 5. */
export interface ChecklistCompletion extends BaseDocument {
  outletId: string
  type: ChecklistType
  date: string
  itemStatuses: Record<string, ChecklistItemStatus>
}
