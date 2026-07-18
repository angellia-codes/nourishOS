import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'

/** employee-disciplinary-action.md §3 — the six-level escalation ladder. */
export type DisciplinaryType = 'coaching' | 'verbalWarning' | 'sp1' | 'sp2' | 'sp3' | 'suspensionTermination'

/** §3/§7 — the four acknowledgment parties. */
export type AckParty = 'employee' | 'departmentHead' | 'generalManager' | 'hrManager'

/** §3 — status lifecycle. */
export type DisciplinaryStatus = 'draft' | 'underReview' | 'finalized' | 'expired' | 'closed'

export interface Acknowledgment {
  party: AckParty
  acknowledgedAt: Timestamp | null
  acknowledgedBy: string | null
}

/**
 * Employee Communication Form / Disciplinary Action — employee-disciplinary-action.md §3.
 * Attachments follow the repo convention (query `files`) rather than the doc's
 * inline `attachments: string[]`. Compensation/salary is not involved.
 */
export interface DisciplinaryAction extends BaseDocument {
  /** Auto-generated server-side: DA-2026-0001. */
  actionNumber: string

  employeeId: string
  /** Denormalized for list/detail display without a join. */
  employeeName: string
  incidentDetails: string
  disciplinaryType: DisciplinaryType

  employeeStatement: string
  proposedSolution: string | null
  companyFurtherAction: string | null
  employeeFurtherAction: string | null
  nextEscalationLevel: DisciplinaryType | null

  validFrom: string // ISO date
  validUntil: string // ISO date

  linkedIncidentId: string | null
  acknowledgments: Acknowledgment[]

  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: DisciplinaryStatus
}
