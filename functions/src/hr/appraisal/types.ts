import type { Bilingual, ScorerModel } from '../positions/types'

/** Mirrors src/types/appraisal.types.ts's v2 shapes — functions/ can't import src/. Keep both copies in step. */
export type { ScorerModel }
export type ApprovalModel = 'gm' | 'none'
export type RatingBand = 'outstanding' | 'excellent' | 'good' | 'needsImprovement' | 'unsatisfactory'
export type AppraisalReviewType = 'probation' | 'quarterly' | 'annual'

export interface AppraisalCriterion {
  criterionId: string
  label: Bilingual
  description: Bilingual
  sourceResponsibilityIds: string[]
  isLeadershipCriterion: boolean
  order: number
}

export interface CriterionScoreInput {
  criterionId: string
  score: number
  note?: string
}
