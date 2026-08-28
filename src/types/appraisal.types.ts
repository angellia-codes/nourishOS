import type { BaseDocument } from './firestore.types'
import type { ApprovalStatus } from '@/constants/statuses'
import type { PositionId } from '@/constants/positions'
import type { Bilingual, ScorerModel } from './position.types'

/**
 * Appraisal v2 — appraisal-v2-design.md. Supersedes the shipped 1-5
 * single-reviewer module below (kept, renamed *V1, so historical records
 * render distinguishably rather than being silently rescaled — §2.8/§13).
 * Per-position criteria derived from Positions Master's keyResponsibilities,
 * dual-scorer (Dept Head 60% + HR 40%) for levels IV-VIII, solo GM-scored
 * for levels I-III.
 */

export type { ScorerModel }
export type ApprovalModel = 'gm' | 'none'
export type RatingBand = 'outstanding' | 'excellent' | 'good' | 'needsImprovement' | 'unsatisfactory'

export const RATING_BAND_LABELS: Record<RatingBand, string> = {
  outstanding: 'Outstanding',
  excellent: 'Excellent',
  good: 'Good',
  needsImprovement: 'Needs Improvement',
  unsatisfactory: 'Unsatisfactory',
}

export interface AppraisalCriterion {
  criterionId: string
  label: Bilingual
  description: Bilingual
  sourceResponsibilityIds: string[]
  isLeadershipCriterion: boolean
  order: number
}

export interface AppraisalTemplate extends BaseDocument {
  positionId: PositionId
  sourcePositionRevision: number
  criteria: AppraisalCriterion[]
  scoringModelVersion: 2
  generationMethod: 'ai' | 'manual'
  generatedAt: string | null
  templateStatus: 'draft' | 'approved' | 'stale' | 'archived'
  approvedByUid: string | null
  approvedAt: string | null
  version: number
}

export interface CriterionScore {
  criterionId: string
  primaryScore: number | null
  secondaryScore: number | null
  weightedScore: number | null
  primaryNote: string | null
  secondaryNote: string | null
}

export interface Acknowledgement {
  acknowledgedAt: string
  signatureFileId: string | null
  deviceOperatorUid: string | null
  witnessedByUid: string | null
  method: 'onDeviceSignature' | 'authenticated'
}

export type AppraisalReviewType = 'probation' | 'quarterly' | 'annual'

export interface Appraisal extends BaseDocument {
  employeeId: string
  positionId: PositionId
  employeeDepartmentId: string | null
  templateId: string
  templateVersion: number
  scoringModelVersion: 2

  reviewType: AppraisalReviewType
  periodLabel: string
  periodStart: string
  periodEnd: string

  scorerModel: ScorerModel
  approvalModel: ApprovalModel
  primaryScorerUid: string
  primaryScorerRole: 'departmentHead' | 'generalManager'
  secondaryScorerUid: string | null
  secondaryScorerRole: 'hrManager' | null

  criterionScores: CriterionScore[]
  primarySubmittedAt: string | null
  primarySubmittedBy: string | null
  secondarySubmittedAt: string | null
  secondarySubmittedBy: string | null

  primaryAverage: number | null
  secondaryAverage: number | null
  finalScore: number | null
  ratingBand: RatingBand | null

  overallComment: string | null
  employeeSelfComment: string | null
  acknowledgement: Acknowledgement | null

  approvalRequestId: string | null
  consequenceTaskId: string | null
  aiInsights: AppraisalAIInsights | null
  status: ApprovalStatus
}

export interface AppraisalAIInsights {
  trainingSuggestions: string[]
  developmentComment: string
  generatedAt: string
  generatedBy: string
}

/**
 * hrRecommendation lives at appraisals/{id}/confidential/recommendation —
 * never on the Appraisal doc itself. Only populated when finalScore < 60
 * (§2.6), read only through getAppraisalRecommendation (never a raw
 * subscription — see appraisalService.ts).
 */
export interface AppraisalRecommendation {
  employeeId: string
  finalScore: number
  ratingBand: RatingBand
  recommendation: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// v1 — shipped 1-5 single-reviewer module. Frozen, never rescaled (§2.8).
// Historical records only; no new v1 appraisal is ever created.
// ---------------------------------------------------------------------------

export type AppraisalScore = 1 | 2 | 3 | 4 | 5

export const APPRAISAL_SCORE_LABELS: Record<AppraisalScore, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectation',
  3: 'Meets Expectation',
  4: 'Exceeds Expectation',
  5: 'Outstanding',
}

export interface AppraisalSubject {
  subjectId: string
  label: string
  description?: string
}

export interface AppraisalTemplateV1 extends BaseDocument {
  positionId: PositionId
  positionLabel: string
  reviewType: AppraisalReviewType
  subjects: AppraisalSubject[]
  version: number
}

export interface AppraisalSubjectScore {
  subjectId: string
  score: AppraisalScore
  reviewerNote?: string
}

export interface AppraisalV1 extends BaseDocument {
  employeeId: string
  reviewerId: string
  positionId: PositionId
  reviewType: AppraisalReviewType
  templateId: string
  templateVersion: number
  periodLabel: string
  subjectScores: AppraisalSubjectScore[]
  overallScore: number
  overallComment: string | null
  status: ApprovalStatus
  approvalRequestId?: string
  aiInsights: AppraisalAIInsights | null
  /** Absent on every real v1 doc (stamped by the migration tool) — use `scoringModelVersion !== 2` to detect v1 when rendering a list that mixes both. */
  scoringModelVersion?: 1
}
