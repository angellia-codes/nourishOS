import type { BaseDocument } from './firestore.types'
import type { DisciplinaryType } from '@/constants/hr'

export interface InvestigationNote {
  note: string
  authoredBy: string
  authoredAt: string
}

/**
 * employee_communication.md §7. `open` is a legacy value: records written before
 * the workflow existed carried only `open`/`closed`, and are not migrated — they
 * simply render as "Open (legacy)" and can still be closed.
 */
export type CommunicationStatus =
  | 'draft'
  | 'pendingApproval'
  | 'pendingEmployee'
  | 'active'
  | 'expired'
  | 'closed'
  | 'open'

/** §16 — receipt is not agreement, so `refused` still starts the validity clock. */
export type AcknowledgementStatus = 'pending' | 'acknowledged' | 'refused' | 'unableToSign'

/** §18 — no signature canvas exists in this app, so a drawn signature is not offered. */
export type SignatureMethod = 'typedSignature' | 'acknowledgement'

/** §11 — Proposed Solution / Action. */
export type ProposedActionCategory =
  | 'coaching'
  | 'retraining'
  | 'counseling'
  | 'followUpMeeting'
  | 'performanceImprovement'
  | 'scheduleAdjustment'
  | 'writtenWarning'
  | 'other'

/** §9 — the incident half of the form. */
export interface CommunicationIncident {
  date: string | null
  /** 'HH:MM', 24-hour. */
  time: string | null
  location: string | null
  details: string | null
  policyReference: string | null
  codeOfConductReference: string | null
}

/** §10. `enteredOnBehalf` marks a statement HR transcribed from paper. */
export interface CommunicationEmployeeStatement {
  text: string
  submittedAt: string
  submittedBy: string
  enteredOnBehalf: boolean
}

/** §11. */
export interface CommunicationProposedAction {
  category: ProposedActionCategory | null
  targetDate: string | null
}

/**
 * §15. The system records what a repeat would mean and links the prior record,
 * but never issues the next step itself — §35 Rule 4 keeps that with HR.
 */
export interface CommunicationRepeatIncident {
  nextExpectedAction: DisciplinaryType | null
  linkedPreviousRecordId: string | null
}

/** §16/§18. `witnessedBy` is set only when someone acted on the employee's behalf. */
export interface CommunicationAcknowledgement {
  status: AcknowledgementStatus
  at: string
  by: string
  method: SignatureMethod
  signedName: string | null
  witnessedBy: string | null
  circumstances: string | null
}

/**
 * The Employee Communication record — employee_communication.md §19, stored in
 * `disciplinaryActions` rather than the spec's own `communicationRecords`
 * collection because it is the same record HR already kept as the detail layer
 * behind Employee's disciplinaryType/Start/End fields (FEATURE_SPECIFICATIONS.md
 * Module 3). No auto-sync between the two; HR maintains both independently.
 *
 * Everything after `investigationNotes` is optional so records created before
 * the workflow landed still type-check.
 */
export interface DisciplinaryRecord extends BaseDocument {
  employeeId: string
  type: DisciplinaryType
  description: string
  investigationNotes: InvestigationNote[]
  status: CommunicationStatus

  /**
   * The employee's own login, resolved server-side at create. Null when they
   * have no NourishOS account, which is the norm for floor staff — firestore.rules
   * gives the employee read access by matching this against `request.auth.uid`.
   */
  employeeUid?: string | null
  /**
   * Denormalized from the employee register at create — §8/§35 Rule 1.
   * departmentId and outletId come from BaseDocument; firestore.rules keys the
   * department-head read branch off departmentId, so a record whose employee has
   * no department is visible to HR only.
   */
  employeeName?: string | null
  employeeNumber?: string | null
  position?: string | null

  incident?: CommunicationIncident | null
  employeeStatement?: CommunicationEmployeeStatement | null
  proposedAction?: CommunicationProposedAction | null
  repeatIncident?: CommunicationRepeatIncident | null
  acknowledgement?: CommunicationAcknowledgement | null

  approvalRequestId?: string | null
  /** True once the GM has signed — the gate firestore.rules checks for §5.5. */
  releasedToEmployee?: boolean
  /** Null means the type carries no expiry (coaching, termination). */
  validityDays?: number | null
  validFrom?: string | null
  validUntil?: string | null
  closureReason?: string | null
}
