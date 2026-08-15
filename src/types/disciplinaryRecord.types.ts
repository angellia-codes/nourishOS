import type { BaseDocument } from './firestore.types'
import type { DisciplinaryType } from '@/constants/hr'

export interface InvestigationNote {
  note: string
  authoredBy: string
  authoredAt: string
}

/** Detail layer behind Employee's disciplinaryType/Start/End fields — FEATURE_SPECIFICATIONS.md Module 3. */
export interface DisciplinaryRecord extends BaseDocument {
  employeeId: string
  type: DisciplinaryType
  description: string
  investigationNotes: InvestigationNote[]
  status: 'open' | 'closed'
}
