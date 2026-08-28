import type { BaseDocument } from './firestore.types'
import type { ContractType } from '@/constants/hr'

/**
 * The recruitment pipeline — employee-requisition.md and HR_OPERATIONS.md
 * §9.4/§12.3. Four documents chained end to end: a requisition is approved, it
 * opens a vacancy, candidates are raised against it, interviews are scheduled
 * per candidate, and hiring one generates an onboarding checklist.
 *
 * Deliberately not built, permanently (see the module README): the conditional
 * Director step for unbudgeted requests (§5) — a confirmed product decision,
 * not an open gap — and the WhatsApp templates in HR_OPERATIONS.md §9.5, since
 * there is no Fonnte adapter, so everything notifies in-app.
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

export const EMPLOYMENT_TYPES = ['ft', 'fl', 'dw', 'ojt'] as const
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
  /** Only meaningful when employmentType is 'ft' — a fixed-term (PKWT) contract is a modifier on a full-time hire, not a peer employment type. */
  contractType?: ContractType | null
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
  /** Set by the approval-resolved handler the moment status flips to 'approved' — null until then. */
  approvedAt?: string | null
  /** Set when filledCount reaches openings (status flips to 'completed') — employee-requisition.md §9's time-to-fill anchor. */
  completedAt?: string | null
}

/**
 * recruitments/{requisitionId}/confidential/compensation — employee-requisition.md
 * §3-C/§4. Split into its own restricted subcollection for the same reason
 * EmployeeCompensation is: firestore.rules can't hide individual fields, and
 * the parent requisition doc is readable by leaders/HR/GM/Director alike.
 */
export interface RequisitionCompensation {
  salaryMin: number
  salaryMax: number
  positionAllowance?: number | null
  phoneAllowance?: number | null
  transportationAllowance?: number | null
  updatedAt: string
  updatedBy: string
}

/**
 * HR_OPERATIONS.md §9.4 pipeline stages. `ST-04B` (GM Interview) is optional,
 * between User Interview and Offering — kept as 'ST-04B' rather than
 * renumbering ST-05..ST-08, so candidates already stored at those stages keep
 * their exact values.
 */
export const CANDIDATE_STAGES = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-04B', 'ST-05', 'ST-06', 'ST-07', 'ST-08'] as const
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  'ST-01': 'Applied',
  'ST-02': 'Screening',
  'ST-03': 'HR Interview',
  'ST-04': 'User Interview',
  'ST-04B': 'GM Interview',
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
  gmInterviewScore?: number | null
  joinDate?: string | null
  employeeId?: string | null
  notes?: string | null
  /** 'portal' for candidate_portal.md self-service applications; absent for records HR typed in. */
  appliedVia?: 'portal' | null
  /** F010, filled in by the candidate — employment-application-form.md §4. Health/criminal/salary answers live in the `confidential` sub-collection instead. */
  applicationForm?: ApplicationForm | null
  discCompletedAt?: string | null
  /** "D/C" — primary/secondary, denormalised for the pipeline board. */
  discSummary?: string | null
  submittedAt?: string | null
}

/** employment-application-form.md §4 — the readable half of F010. */
export interface ApplicationForm {
  personalData: {
    fullName: string
    gender: 'male' | 'female' | null
    placeOfBirth: string
    dateOfBirth: string | null
    nationality: string
    maritalStatus: string
    religion: string
    email: string
    phone: string
  }
  address: { permanentAddress: string; domicileAddress: string }
  formalEducation: EducationEntry[]
  informalEducation: EducationEntry[]
  training: { name: string; organizerLocation: string; monthYear: string }[]
  languages: {
    language: string
    speaking: LanguageProficiency | null
    reading: LanguageProficiency | null
    writing: LanguageProficiency | null
  }[]
  workExperience: {
    companyName: string
    companyType: string
    periodStart: string
    periodEnd: string
    position: string
    reasonForResignation: string
  }[]
  additionalQuestions: {
    knowsAboutCompany: string
    expectationsIfHired: string
    willingToRelocate: boolean
    willingToTravel: boolean
    preferredEnvironment: 'office' | 'field' | null
    strengths: string[]
    weaknesses: string[]
    willingToAttachReferenceLetter: boolean
    referenceLetterDeclineReason: string
    expectedRemuneration: string
  }
  references: {
    name: string
    phone: string
    company: string
    department: string
    position: string
    relationship: string
  }[]
  declarationAccepted: boolean
  declarationAcceptedAt: string | null
}

export type LanguageProficiency = 'excellent' | 'good' | 'basic'

export interface EducationEntry {
  schoolType: string
  institutionName: string
  city: string
  major: string
  graduationYear: string
}

/**
 * candidates/{id}/confidential/application — employment-application-form.md §3.
 * A separate document because `firestore.rules` gates documents, not fields;
 * reading it needs `recruitment.viewSensitive`.
 */
export interface ApplicationFormSensitive {
  seriousIllnessHistory: boolean
  seriousIllnessDetail: string
  criminalHistory: boolean
  criminalHistoryDetail: string
  workExperienceSalaries: { index: number; companyName: string; salary: number | null }[]
}

export const DISC_DIMENSIONS = ['D', 'I', 'S', 'C'] as const
export type DiscDimension = (typeof DISC_DIMENSIONS)[number]

export const DISC_STYLE_LABELS: Record<DiscDimension, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Conscientiousness',
}

/** discResults/{candidateId} — candidate_portal.md §10.3, scored server-side only. */
export interface DiscResult {
  candidateId: string
  candidateNumber: string | null
  outletId: string | null
  departmentId: string | null
  scores: Record<DiscDimension, number>
  primaryStyle: DiscDimension
  secondaryStyle: DiscDimension
  responses: { questionId: string; answer: string }[]
  completedAt: string
  calculatedBy: string
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
  stage: Extract<CandidateStage, 'ST-03' | 'ST-04' | 'ST-04B'>
  interviewerUid: string
  scheduledAt: string // ISO datetime
  durationMinutes: number
  location: string
  calendarEventId?: string | null
  outcome: InterviewOutcome
  score?: number | null // 1–5; the mean of `criteria` when a scorecard was filled in
  /** candidate_portal.md §13 — all six or none. */
  criteria?: Record<ScorecardCriterion, number> | null
  strengths?: string | null
  concerns?: string | null
  recommendation?: InterviewRecommendation | null
  notes?: string | null
}

export const SCORECARD_CRITERIA = [
  'communication',
  'attitude',
  'technicalKnowledge',
  'teamwork',
  'problemSolving',
  'cultureFit',
] as const
export type ScorecardCriterion = (typeof SCORECARD_CRITERIA)[number]

export const SCORECARD_CRITERION_LABELS: Record<ScorecardCriterion, string> = {
  communication: 'Communication',
  attitude: 'Attitude',
  technicalKnowledge: 'Technical knowledge',
  teamwork: 'Teamwork',
  problemSolving: 'Problem solving',
  cultureFit: 'Culture fit',
}

export const INTERVIEW_RECOMMENDATIONS = ['proceed', 'hold', 'reject'] as const
export type InterviewRecommendation = (typeof INTERVIEW_RECOMMENDATIONS)[number]

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
