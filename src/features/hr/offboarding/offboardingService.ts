import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { OffboardingChecklist, ExitInterview, ExitInterviewRating, Task } from '@/types'

/** Every read and write for the exit/offboarding half of employee-onboarding-exit-checklist.md §5. */

export function updateOffboardingItem(input: {
  checklistId: string
  itemNumber: number
  itemStatus: 'pending' | 'received' | 'notApplicable'
  fileId?: string
}): Promise<{ checklistId: string; outstandingMandatory: number }> {
  return callFunction('updateOffboardingItem', input)
}

export function completeOffboarding(checklistId: string): Promise<{ checklistId: string }> {
  return callFunction('completeOffboarding', { checklistId })
}

export function getOffboardingChecklist(checklistId: string): Promise<OffboardingChecklist | null> {
  return getDocument<OffboardingChecklist>(COLLECTIONS.OFFBOARDING_CHECKLISTS, checklistId)
}

export function subscribeToOffboardingChecklists(
  onChange: (rows: OffboardingChecklist[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<OffboardingChecklist>(
    COLLECTIONS.OFFBOARDING_CHECKLISTS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
    onError,
  )
}

/** One-shot — the employee profile's "Separation" card doesn't need a live listener. */
export async function getOffboardingChecklistForEmployee(employeeId: string): Promise<OffboardingChecklist | null> {
  const rows = await queryDocuments<OffboardingChecklist>(COLLECTIONS.OFFBOARDING_CHECKLISTS, [
    where('employeeId', '==', employeeId),
    orderBy('createdAt', 'desc'),
  ])
  return rows[0] ?? null
}

/**
 * One-shot, best-effort: tasks.rules only grants read to an assignee, the
 * creator, or an elevated role (superAdmin/director/generalManager — hrManager
 * is deliberately not "elevated" there), so an HR account viewing a checklist
 * someone else archived may see an empty list rather than a permission error.
 * That's an existing app-wide tasks-visibility limitation, not new here.
 */
export async function listOffboardingTasks(checklistId: string): Promise<Task[]> {
  try {
    return await queryDocuments<Task>(COLLECTIONS.TASKS, [where('referenceId', '==', checklistId)])
  } catch {
    return []
  }
}

// ---- Exit Interview ----

export interface SubmitExitInterviewInput {
  employeeId: string
  offboardingChecklistId: string
  interviewDate: string
  recruitmentSource: string
  recruitmentSourceOther?: string
  joinReason: string
  joinReasonOther?: string
  exitReason: string
  exitReasonOther?: string
  resignationCategory: 'voluntary' | 'involuntary'
  expectationsWereClear: boolean
  expectationsExplanation?: string
  trainingMetExpectations: boolean
  trainingExplanation?: string
  intendedTenure: string
  ratings: ExitInterviewRating[]
  wouldReturnToWork: boolean
  wouldReturnExplanation?: string
  employeeAcknowledged: boolean
  interviewerAcknowledged: boolean
}

export function submitExitInterview(input: SubmitExitInterviewInput): Promise<{ exitInterviewId: string }> {
  return callFunction('submitExitInterview', input)
}

export function getExitInterview(exitInterviewId: string): Promise<ExitInterview | null> {
  return getDocument<ExitInterview>(COLLECTIONS.EXIT_INTERVIEWS, exitInterviewId)
}

export interface ExitInterviewInsights {
  totalInterviews: number
  turnoverReasonBreakdown: Record<string, number>
  resignationCategory: { voluntary: number; involuntary: number; voluntaryRate: number }
  companySatisfactionTrend: Array<{ month: string; average: number; count: number }>
  managerRatingAverages: Record<string, { average: number; interviewCount: number }>
  recruitmentSourceEffectiveness: Record<string, Record<string, number>>
}

export function getExitInterviewInsights(): Promise<ExitInterviewInsights> {
  return callFunction('getExitInterviewInsights', {})
}
