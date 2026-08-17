import type { BaseDocument } from './firestore.types'
import type { CandidateSource, DocumentChecklistItem } from './recruitment.types'

/**
 * employee-onboarding-exit-checklist.md §5 — the F01 OUT list's 3 document
 * rows (resignation letter, out photo, bermaterai statement) live as an
 * embedded array here, same shared `DocumentChecklistItem` shape the
 * onboarding checklist uses (§6). The other 6 OUT items become real Task
 * Engine tasks (`taskIds`) — see functions/src/hr/employees/offboarding.ts.
 */
export interface OffboardingChecklist extends BaseDocument {
  employeeId: string
  employeeName: string
  departmentId: string
  outletId: string
  lastWorkingDate: string
  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: 'inProgress' | 'completed'
  documentChecklist: DocumentChecklistItem[]
  taskIds: string[]
  /** Whether the Task/Work Reassignment Review task was generated — §5 item 8's backoffice/supervisor gate. */
  handoverRequired: boolean
  exitInterviewId?: string | null
  completedAt?: string | null
}

/** exit-interview.md §3 — Sections H/I/J rating blocks, one flat array so item wording can change per surveyVersion without a schema migration. */
export type ExitInterviewSection = 'company' | 'manager' | 'culture'

export interface ExitInterviewRating {
  section: ExitInterviewSection
  itemKey: string
  itemLabel: string
  score: 1 | 2 | 3 | 4
}

export type ExitInterviewJoinReason =
  | 'establishedCompany'
  | 'companyReputation'
  | 'friendReferral'
  | 'careerOpportunity'
  | 'salaryIncrease'
  | 'trainingProgram'
  | 'other'

export type ExitInterviewExitReason =
  | 'personal'
  | 'continuingStudy'
  | 'health'
  | 'relocation'
  | 'transportationTooFar'
  | 'resignedWithoutNotice'
  | 'anotherJobSameIndustry'
  | 'anotherJobDifferentIndustry'
  | 'notReturningFromLeave'
  | 'pension'
  | 'contractExpiration'
  | 'other'

export type ExitInterviewIntendedTenure = '0-3m' | '4-6m' | '6-9m' | '12m' | '2y' | '>2y'

/**
 * exitInterviews/{interviewId} — F009, filled in from the "Exit Interview"
 * offboarding task. Confidentiality wall: `exitInterviews.view`
 * (hrManager/superAdmin only, not even the employee's own manager) — see §4.
 * Immutable once both acknowledgments are recorded; no updateExitInterview.
 */
export interface ExitInterview extends BaseDocument {
  employeeId: string
  offboardingChecklistId: string
  interviewerId: string
  interviewDate: string
  surveyVersion: string
  /** Denormalized from Employee.managerId at submission — needed for §6's per-manager rating aggregation (not itself in the doc's schema table). */
  employeeManagerId?: string | null

  recruitmentSource: CandidateSource
  recruitmentSourceOther?: string | null

  joinReason: ExitInterviewJoinReason
  joinReasonOther?: string | null

  exitReason: ExitInterviewExitReason
  exitReasonOther?: string | null

  resignationCategory: 'voluntary' | 'involuntary'

  expectationsWereClear: boolean
  expectationsExplanation?: string | null
  trainingMetExpectations: boolean
  trainingExplanation?: string | null

  intendedTenure: ExitInterviewIntendedTenure

  ratings: ExitInterviewRating[]

  wouldReturnToWork: boolean
  wouldReturnExplanation?: string | null

  employeeAcknowledged: boolean
  employeeAcknowledgedAt?: string | null
  interviewerAcknowledged: boolean
  interviewerAcknowledgedAt?: string | null
}
