/**
 * Mirrors src/types/position.types.ts (functions/ can't import src/ — same
 * duplication story as lib/positions.ts). Keep both copies in step.
 */

export type PositionLevel = '0' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII'

export type ScorerModel = 'dualScorer' | 'soloScorer' | 'none'

export interface Bilingual {
  id: string
  en: string
}

export interface PositionResponsibility {
  responsibilityId: string
  text: Bilingual
  order: number
  isRemoved: boolean
}

export interface PositionSeed {
  positionId: string
  title: Bilingual
  departmentId: string
  level: PositionLevel
  appraisalScorerPositionId: string | null
  isAppraisable: boolean
}
