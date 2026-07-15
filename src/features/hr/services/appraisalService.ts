import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type {
  Appraisal,
  AppraisalTemplate,
  AppraisalSubjectScore,
  AppraisalReviewType,
} from '@/types'
import type { PositionId } from '@/constants/positions'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateAppraisalInput {
  employeeId: string
  positionId: PositionId
  reviewType: AppraisalReviewType
  periodLabel: string
}

export function createAppraisal(input: CreateAppraisalInput): Promise<{ appraisalId: string }> {
  return callFunction('createAppraisal', input)
}

export interface SubmitAppraisalInput {
  appraisalId: string
  subjectScores: AppraisalSubjectScore[]
  overallComment?: string
}

/**
 * Validates completeness, computes overallScore, and routes to GM approval
 * server-side — all confirmed decisions from the design discussion, not
 * something the client is trusted to do itself.
 */
export function submitAppraisal(input: SubmitAppraisalInput): Promise<void> {
  return callFunction('submitAppraisal', input)
}

/** On-demand only — never triggered automatically on submit (confirmed decision). */
export function generateAppraisalInsights(
  appraisalId: string,
): Promise<{ trainingSuggestions: string[]; developmentComment: string }> {
  return callFunction('generateAppraisalInsights', { appraisalId })
}

export function getAppraisal(appraisalId: string): Promise<Appraisal | null> {
  return getDocument<Appraisal>(COLLECTIONS.APPRAISALS, appraisalId)
}

export function subscribeToAppraisal(
  appraisalId: string,
  onChange: (appraisal: Appraisal | null) => void,
): Unsubscribe {
  return subscribeToDocument<Appraisal>(COLLECTIONS.APPRAISALS, appraisalId, onChange)
}

export function getMyAppraisalsAsEmployee(employeeId: string): Promise<Appraisal[]> {
  return queryDocuments<Appraisal>(COLLECTIONS.APPRAISALS, [
    where('employeeId', '==', employeeId),
    orderBy('createdAt', 'desc'),
  ])
}

export function getMyAppraisalsAsReviewer(reviewerId: string): Promise<Appraisal[]> {
  return queryDocuments<Appraisal>(COLLECTIONS.APPRAISALS, [
    where('reviewerId', '==', reviewerId),
    orderBy('createdAt', 'desc'),
  ])
}

/** Active template for a position + review type — the latest version only. */
export async function getAppraisalTemplate(
  positionId: PositionId,
  reviewType: AppraisalReviewType,
): Promise<AppraisalTemplate | null> {
  const templates = await queryDocuments<AppraisalTemplate>(COLLECTIONS.APPRAISAL_TEMPLATES, [
    where('positionId', '==', positionId),
    where('reviewType', '==', reviewType),
    where('isArchived', '==', false),
    orderBy('version', 'desc'),
  ])
  return templates[0] ?? null
}
