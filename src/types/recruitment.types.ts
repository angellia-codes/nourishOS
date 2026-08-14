import type { BaseDocument } from './firestore.types'

/**
 * The recruitment pipeline — employee-requisition.md and HR_OPERATIONS.md
 * §9.4/§12.3. Four documents chained end to end: a requisition is approved, it
 * opens a vacancy, candidates are raised against it, interviews are scheduled
 * per candidate, and hiring one generates an onboarding checklist.
 *
 * Deliberately not built in this pass (see the module README): the compensation
 * subdocument (employee-requisition.md §3-C), the conditional Director step for
 * unbudgeted requests (§5), and the WhatsApp templates in HR_OPERATIONS.md §9.5
 * — there is no Fonnte adapter, so everything notifies in-app.
 */

/**
 * Two status fields, not one — employee-requisition.md §2. `status` is the
 * approval lifecycle owned by the Approval Engine; `vacancyStage` is the
 * recruitment lifecycle and does not exist until `status === 'approved'`.
 */
export const REQUISITION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'completed',
  'cancelled',
] as const
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number]

export const VACANCY_STAGES = ['open', 'sourcing', 'interviewing', 'offering', 'filled', 'closed'] as const
export type VacancyStage = (typeof VACANCY_STAGES)[number]

export const EMPLOYMENT_TYPES = ['ft', 'fl', 'dw', 'ojt', 'fixed_term'] as const
export type RequisitionEmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const REQUISITION_TYPES = ['new_position', 'replacement', 'seasonal'] as const
export type RequisitionType = (typeof REQUISITION_TYPES)[number]

export const URGENCIES = ['normal', 'urgent', 'critical'] as const
export type RequisitionUrgency = (typeof URGENCIES)[number]

/** recruitments/{requisitionId} — employee-requisition.md §4. */
export interface Requisition extends BaseDocument {
  requisitionNumber: string | null // REQ-2026-0042, allocated on submit
  outletId: string
  departmentId: string
  position: string
  openings: number
  employmentType: RequisitionEmploymentType
  contractMonths?: number | null
  requisitionType: RequisitionType
  replacingEmployeeId?: string | null
  targetJoinDate: string // ISO YYYY-MM-DD
  urgency: RequisitionUrgency
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: RequisitionStatus
  vacancyStage: VacancyStage | null
  approvalRequestId?: string | null
  hiredCandidateIds: string[]
  filledCount: number
}

/** HR_OPERATIONS.md §9.4 pipeline stages. */
export const CANDIDATE_STAGES = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08'] as const
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  'ST-01': 'Applied',
  'ST-02': 'Screening',
  'ST-03': 'HR Interview',
  'ST-04': 'User Interview',
  'ST-05': 'Offering',
  'ST-06': 'Hired',
  'ST-07': 'Rejected',
  'ST-08': 'Withdrawn',
}

/**
 * The recruitment source superset from employment-application-form.md §2 —
 * also employee-onboarding-exit-checklist.md §4 item 30.
 */
export const CANDIDATE_SOURCES = [
  'jobPortal',
  'referral',
  'socialMedia',
  'broadcast',
  'newspaperAd',
  'appliedDirectly',
  'otherAdvertisement',
  'employmentAgency',
  'other',
] as const
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number]

/** Append-only stage log — HR_OPERATIONS.md §12.3 / E04-US02. */
export interface StageHistoryEntry {
  from: CandidateStage | null
  to: CandidateStage
  actor: string
  timestamp: string
}

/** candidates/{candidateId} — HR_OPERATIONS.md §12.3. */
export interface Candidate extends BaseDocument {
  candidateNumber: string // C-2026-0007
  requisitionId: string
  fullName: string
  phone: string
  email?: string | null
  positionApplied: string
  source: CandidateSource
  applicationDate: string // ISO YYYY-MM-DD
  currentStage: CandidateStage
  stageChangedAt: string
  stageHistory: StageHistoryEntry[]
  hrInterviewScore?: number | null
  userInterviewScore?: number | null
  joinDate?: string | null
  employeeId?: string | null
  notes?: string | null
}

export const INTERVIEW_OUTCOMES = ['pending', 'pass', 'fail', 'noShow'] as const
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number]

/**
 * interviews/{interviewId} — HR_OPERATIONS.md §9.4-F05/F07. `stage` is the
 * candidate stage the interview belongs to, which is what decides whether the
 * score lands on hrInterviewScore or userInterviewScore.
 */
export interface Interview extends BaseDocument {
  candidateId: string
  candidateName: string
  stage: Extract<CandidateStage, 'ST-03' | 'ST-04'>
  interviewerUid: string
  scheduledAt: string // ISO datetime
  durationMinutes: number
  location: string
  calendarEventId?: string | null
  outcome: InterviewOutcome
  score?: number | null // 1–5
  notes?: string | null
}

/**
 * One row of the F01 IN checklist — employee-onboarding-exit-checklist.md §6.
 * `tier` is the form's own two-marker system: `mandatory` (*) blocks
 * completion, `followUp` (**) is outstanding but never blocks, `optional`
 * never blocks and never nudges, `process` is a checkbox with no document.
 */
export interface DocumentChecklistItem {
  itemNumber: number
  label: string
  tier: 'mandatory' | 'followUp' | 'optional' | 'process'
  treatment: 'collect' | 'verify' | 'generate' | 'notDigitized'
  linkedRecordType?: 'candidate' | 'requisition' | 'contract' | 'employee' | null
  linkedRecordId?: string | null
  status: 'pending' | 'received' | 'notApplicable'
  receivedDate?: string | null
  fileId?: string | null
}

/** onboardingChecklists/{checklistId} — generated when a candidate reaches ST-06. */
export interface OnboardingChecklist extends BaseDocument {
  candidateId: string
  candidateName: string
  requisitionId: string
  employeeId?: string | null
  joinDate?: string | null
  /** Overrides BaseDocument's generic status with this module's lifecycle. */
  status: 'inProgress' | 'completed'
  documentChecklist: DocumentChecklistItem[]
  taskIds: string[]
  completedAt?: string | null
}
