import type { Timestamp } from 'firebase/firestore'
import type { BaseDocument } from './firestore.types'
import type { ApprovalStatus } from '@/constants/statuses'
import type { PositionId } from '@/constants/positions'

/**
 * Performance Appraisal — structured extension of HR.md §10 Performance
 * Management. Confirmed design decisions (not doc defaults):
 *   - Different subject sets per review type (no inheritance between them)
 *   - AI training suggestions + development comment generated on-demand,
 *     never automatically
 *   - Every review type (including probation) routes through GM approval
 *     via the Approval Engine before being marked Completed
 */

export type AppraisalReviewType = 'probation' | 'quarterly' | 'annual'

export type AppraisalScore = 1 | 2 | 3 | 4 | 5

export const APPRAISAL_SCORE_LABELS: Record<AppraisalScore, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectation',
  3: 'Meets Expectation',
  4: 'Exceeds Expectation',
  5: 'Outstanding',
}

/** A single review criterion within a template, e.g. "Upselling Skill". */
export interface AppraisalSubject {
  subjectId: string
  label: string
  description?: string
}

/**
 * Defines which subjects apply to a given position + review type.
 * Firestore-backed rather than hardcoded (shared-service.md §17 — avoid
 * hardcoded dropdowns) so HR can edit criteria later without a code deploy.
 * See src/constants/appraisalTemplateSeeds.ts for the default seed content
 * used to populate this collection on first deploy.
 */
export interface AppraisalTemplate extends BaseDocument {
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

export interface AppraisalAIInsights {
  trainingSuggestions: string[]
  developmentComment: string
  generatedAt: Timestamp
  generatedBy: string // uid of whoever triggered generation
}

/**
 * One review instance. Workflow reuses the global standard:
 *   Draft -> Submitted -> PendingApproval -> Approved / Rejected -> Completed
 * PendingApproval is always routed to GM/Director regardless of reviewType.
 */
export interface Appraisal extends BaseDocument {
  employeeId: string
  reviewerId: string
  positionId: PositionId
  reviewType: AppraisalReviewType
  templateId: string
  templateVersion: number
  periodLabel: string // e.g. "Q3 2026", "Probation - Month 3", "FY2026"
  subjectScores: AppraisalSubjectScore[]
  overallScore: number // average of subjectScores — computed server-side on submit, never client-set
  status: ApprovalStatus
  approvalRequestId?: string // links into the normalized Approval Engine once submitted
  aiInsights: AppraisalAIInsights | null // null until generateAppraisalInsights() is explicitly triggered
}
