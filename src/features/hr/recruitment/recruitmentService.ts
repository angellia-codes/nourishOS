import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type {
  Candidate,
  CandidateStage,
  Interview,
  OnboardingChecklist,
  Requisition,
} from '@/types'

/**
 * Every read and write for the recruitment pipeline — requisitions, candidates,
 * interviews, onboarding. One file rather than four: they are queried together
 * on nearly every page, and four near-identical modules would be four places to
 * keep the same conventions in.
 */

// ---- Requisitions ----

export interface RequisitionInput {
  outletId: string
  departmentId: string
  position: string
  openings: number
  employmentType: string
  contractMonths?: number | null
  requisitionType: string
  replacingEmployeeId?: string | null
  targetJoinDate: string
  urgency: string
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
}

export function createRequisition(input: RequisitionInput): Promise<{ requisitionId: string }> {
  return callFunction('createRequisition', input)
}

export function updateRequisition(input: RequisitionInput & { requisitionId: string }): Promise<{ requisitionId: string }> {
  return callFunction('updateRequisition', input)
}

export function submitRequisition(requisitionId: string): Promise<{ requisitionId: string; requisitionNumber: string }> {
  return callFunction('submitRequisition', { requisitionId })
}

export function cancelRequisition(
  requisitionId: string,
  reason: string,
  confirm = false,
): Promise<{ requisitionId: string }> {
  return callFunction('cancelRequisition', { requisitionId, reason, confirm })
}

export function getRequisition(requisitionId: string): Promise<Requisition | null> {
  return getDocument<Requisition>(COLLECTIONS.RECRUITMENTS, requisitionId)
}

export function subscribeToRequisitions(
  onChange: (rows: Requisition[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Requisition>(
    COLLECTIONS.RECRUITMENTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}

/** Approved, still-open requisitions — the only ones a candidate can be raised against. */
export function listOpenRequisitions(): Promise<Requisition[]> {
  return queryDocuments<Requisition>(COLLECTIONS.RECRUITMENTS, [
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc'),
  ]).then((rows) => rows.filter((row) => row.status === 'approved'))
}

// ---- Candidates ----

export interface CandidateInput {
  requisitionId: string
  fullName: string
  phone: string
  email?: string | null
  positionApplied: string
  source: string
  applicationDate?: string
  notes?: string | null
  allowDuplicate?: boolean
}

export function createCandidate(input: CandidateInput): Promise<{ candidateId: string; candidateNumber: string }> {
  return callFunction('createCandidate', input)
}

export function updateCandidate(
  input: Omit<CandidateInput, 'requisitionId' | 'allowDuplicate'> & { candidateId: string },
): Promise<{ candidateId: string }> {
  return callFunction('updateCandidate', input)
}

export function moveCandidateStage(input: {
  candidateId: string
  toStage: CandidateStage
  joinDate?: string
  reason?: string
}): Promise<{ candidateId: string; currentStage: CandidateStage; onboardingChecklistId: string | null }> {
  return callFunction('moveCandidateStage', input)
}

export function getCandidate(candidateId: string): Promise<Candidate | null> {
  return getDocument<Candidate>(COLLECTIONS.CANDIDATES, candidateId)
}

export function subscribeToCandidates(
  onChange: (rows: Candidate[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Candidate>(
    COLLECTIONS.CANDIDATES,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}

export function listCandidatesForRequisition(requisitionId: string): Promise<Candidate[]> {
  return queryDocuments<Candidate>(COLLECTIONS.CANDIDATES, [
    where('requisitionId', '==', requisitionId),
    orderBy('createdAt', 'desc'),
  ])
}

// ---- Interviews ----

export interface ScheduleInterviewInput {
  candidateId: string
  stage: CandidateStage
  interviewerUid: string
  scheduledAt: string
  durationMinutes: number
  location: string
  overrideReason?: string
}

export function scheduleInterview(
  input: ScheduleInterviewInput,
): Promise<{ interviewId: string; calendarEventId: string }> {
  return callFunction('scheduleInterview', input)
}

export function recordInterviewOutcome(input: {
  interviewId: string
  outcome: 'pass' | 'fail' | 'noShow'
  score?: number
  notes?: string
}): Promise<{ interviewId: string; score: number | null }> {
  return callFunction('recordInterviewOutcome', input)
}

export function cancelInterview(interviewId: string, reason: string): Promise<{ interviewId: string }> {
  return callFunction('cancelInterview', { interviewId, reason })
}

export function listInterviewsForCandidate(candidateId: string): Promise<Interview[]> {
  return queryDocuments<Interview>(COLLECTIONS.INTERVIEWS, [
    where('candidateId', '==', candidateId),
    orderBy('scheduledAt', 'asc'),
  ])
}

// ---- Onboarding ----

export function updateOnboardingItem(input: {
  checklistId: string
  itemNumber: number
  itemStatus: 'pending' | 'received' | 'notApplicable'
  fileId?: string
  linkedRecordId?: string
}): Promise<{ checklistId: string; outstandingMandatory: number }> {
  return callFunction('updateOnboardingItem', input)
}

export function completeOnboarding(checklistId: string): Promise<{ checklistId: string }> {
  return callFunction('completeOnboarding', { checklistId })
}

export function getOnboardingChecklist(checklistId: string): Promise<OnboardingChecklist | null> {
  return getDocument<OnboardingChecklist>(COLLECTIONS.ONBOARDING_CHECKLISTS, checklistId)
}

export function subscribeToOnboardingChecklists(
  onChange: (rows: OnboardingChecklist[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<OnboardingChecklist>(
    COLLECTIONS.ONBOARDING_CHECKLISTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}
