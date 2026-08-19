import type { BaseDocument } from './firestore.types'
import type { TrainingType } from '@/constants/hr'

/** HR.md §11 Training Catalog — not employee-scoped, not sensitive. */
export interface Training extends BaseDocument {
  title: string
  type: TrainingType
  description?: string
  mandatory: boolean
}

/** One employee's assignment to a catalog Training — tracks completion + certificate. */
export interface TrainingAssignment extends BaseDocument {
  trainingId: string
  employeeId: string
  dueDate?: string | null
  status: 'assigned' | 'completed'
  completedAt?: string | null
}
