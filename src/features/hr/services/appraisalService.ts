import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToDocument, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type {
  Appraisal,
  AppraisalTemplate,
  AppraisalRecommendation,
  AppraisalReviewType,
} from '@/types'
import type { PositionId } from '@/constants/positions'
import type { Unsubscribe } from '@/services/firestore'

// ---------------------------------------------------------------------------
// Templates — §6
// ---------------------------------------------------------------------------

export function generateAppraisalTemplate(positionId: string): Promise<{ templateId: string }> {
  return callFunction('generateAppraisalTemplate', { positionId })
}

export function approveAppraisalTemplate(templateId: string): Promise<void> {
  return callFunction('approveAppraisalTemplate', { templateId })
}

export function getAppraisalTemplate(templateId: string): Promise<AppraisalTemplate | null> {
  return getDocument<AppraisalTemplate>(COLLECTIONS.APPRAISAL_TEMPLATES, templateId)
}

/** Every template, newest first — the review/approve queue and the per-position history. */
export function listAppraisalTemplates(): Promise<AppraisalTemplate[]> {
  return queryDocuments<AppraisalTemplate>(COLLECTIONS.APPRAISAL_TEMPLATES, [orderBy('createdAt', 'desc')])
}

export function listTemplatesForPosition(positionId: string): Promise<AppraisalTemplate[]> {
  return queryDocuments<AppraisalTemplate>(COLLECTIONS.APPRAISAL_TEMPLATES, [
    where('positionId', '==', positionId),
    orderBy('version', 'desc'),
  ])
}

// ---------------------------------------------------------------------------
// Appraisals — §7
// ---------------------------------------------------------------------------

export interface CreateAppraisalInput {
  employeeId: string
  reviewType: AppraisalReviewType
  periodLabel: string
  periodStart: string
  periodEnd: string
}

export function createAppraisal(input: CreateAppraisalInput): Promise<{ appraisalId: string }> {
  return callFunction('createAppraisal', input)
}

interface CriterionScoreInput {
  criterionId: string
  score: number
  note?: string
}

/** Department Head (dualScorer) or GM (soloScorer). §2.4 — the hook this backs never fetches secondary scores. */
export function submitPrimaryScores(input: {
  appraisalId: string
  criterionScores: CriterionScoreInput[]
  overallComment?: string
}): Promise<void> {
  return callFunction('submitPrimaryScores', input)
}

/** HR's 40%. §2.4 — never call this after peeking at the DH's scores; there is no read path to them before this submits. */
export function submitSecondaryScores(input: {
  appraisalId: string
  criterionScores: CriterionScoreInput[]
}): Promise<void> {
  return callFunction('submitSecondaryScores', input)
}

export function acknowledgeAppraisal(input: {
  appraisalId: string
  signatureFileId?: string
  witnessedByUid?: string
}): Promise<void> {
  return callFunction('acknowledgeAppraisal', input)
}

export function reopenAppraisal(appraisalId: string, reason: string): Promise<void> {
  return callFunction('reopenAppraisal', { appraisalId, reason })
}

/** §2.6 — the one narrow read that must go through a callable, never a direct Firestore subscription (self-exclusion is enforced server-side). */
export function getAppraisalRecommendation(appraisalId: string): Promise<AppraisalRecommendation | null> {
  return callFunction('getAppraisalRecommendation', { appraisalId })
}

/** On-demand only — never triggered automatically. */
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

export function getMyAppraisalsAsPrimaryScorer(uid: string): Promise<Appraisal[]> {
  return queryDocuments<Appraisal>(COLLECTIONS.APPRAISALS, [
    where('primaryScorerUid', '==', uid),
    orderBy('createdAt', 'desc'),
  ])
}

export function getMyAppraisalsAsSecondaryScorer(uid: string): Promise<Appraisal[]> {
  return queryDocuments<Appraisal>(COLLECTIONS.APPRAISALS, [
    where('secondaryScorerUid', '==', uid),
    orderBy('createdAt', 'desc'),
  ])
}

/** All appraisals, newest first — small roster, client-side filter, same convention as listAllAppraisals's v1 precedent. */
export function listAllAppraisals(): Promise<Appraisal[]> {
  return queryDocuments<Appraisal>(COLLECTIONS.APPRAISALS, [orderBy('createdAt', 'desc')])
}

// Re-exported for callers that still need a PositionId-typed id (e.g. the create form).
export type { PositionId }
