import type { BaseDocument } from './firestore.types'
import type { PositionId } from '@/constants/positions'

/**
 * Positions Master — POSITIONS_MASTER_DESIGN.md. The canonical catalogue of
 * every job at Nourish Group, independent of who occupies it. Layered on top
 * of the existing `src/constants/positions.ts` `POSITION_CATALOG` rather than
 * replacing it: that catalog already does department/outlet-scoped dropdown
 * curation well (2026-08-17 pass) and has nothing to do with JD content or
 * appraisal — this collection is seeded 1:1 on the same `PositionId` slugs
 * and adds the fields the catalog never carried (JD content, tier, appraisal
 * scorer). See CLAUDE.md "Current state of the tree" for the full rationale.
 */

export type PositionLevel = '0' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII'

export type ScorerModel = 'dualScorer' | 'soloScorer' | 'none'

export interface Bilingual {
  id: string
  en: string
}

export interface PositionResponsibility {
  /** Stable — Appraisal v2 criteria reference these. Never regenerated on edit; tombstoned, not spliced, on removal. */
  responsibilityId: string
  text: Bilingual
  order: number
  isRemoved: boolean
}

export interface Position extends BaseDocument {
  positionId: PositionId
  title: Bilingual
  /** The app's operational department taxonomy (`@/constants/organization`'s DEPARTMENTS), not POSITIONS.md §3's own JD grouping. */
  departmentId: string
  divisionId: string | null
  level: PositionLevel

  /** Explicit — never inferred (§2.5). Only meaningful for dualScorer positions (level IV–VIII); null for soloScorer/none. */
  appraisalScorerPositionId: PositionId | null
  isAppraisable: boolean

  jobOverview: Bilingual
  keyResponsibilities: PositionResponsibility[]
  authority: Bilingual[]
  workingRelationships: { internal: Bilingual[]; external: Bilingual[] }
  qualifications: {
    education: Bilingual
    experience: Bilingual
    certification: Bilingual
    language: Bilingual
    computerSkills: Bilingual
  }
  knowledge: Bilingual[]
  skills: { soft: Bilingual[]; hard: Bilingual[] }
  competencies: Bilingual[]
  performanceExpectations: Bilingual

  supervisesPositionIds: PositionId[]
  supervisesNote: Bilingual | null

  /** 'draft' = no real JD content yet (§7 fallback) — cannot generate an appraisal template. */
  positionStatus: 'draft' | 'active'
  revision: number
  effectiveDate: string | null
  sourceFileId: string | null
  isActive: boolean
}

/** Appraisal v2 §2.3 — mirrors functions/src/hr/positions/tierLadder.ts's LEVEL_TO_SCORER_MODEL. Keep in step. */
export const LEVEL_TO_SCORER_MODEL: Record<PositionLevel, ScorerModel> = {
  '0': 'none',
  I: 'soloScorer',
  II: 'soloScorer',
  III: 'soloScorer',
  IV: 'dualScorer',
  V: 'dualScorer',
  VI: 'dualScorer',
  VII: 'dualScorer',
  VIII: 'dualScorer',
}

export const POSITION_LEVEL_LABELS: Record<PositionLevel, string> = {
  '0': 'Level 0 — Executive Board',
  I: 'Level I — Executive Committee / Division Head',
  II: 'Level II — Department Head / Senior Manager',
  III: 'Level III — Assistant Department / Manager',
  IV: 'Level IV — Assistant Manager',
  V: 'Level V — Supervisor I / Senior Supervisor',
  VI: 'Level VI — Supervisor II / Junior Supervisor',
  VII: 'Level VII — Rank & File I / Senior Staff',
  VIII: 'Level VIII — Rank & File II / Junior Staff',
}
