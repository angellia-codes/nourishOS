import type { PositionLevel, ScorerModel, Bilingual } from './types'

/** POSITIONS_MASTER_DESIGN.md §3 — canonical tier ladder, seeded constant not parsed from JD free text. */
export const TIER_LADDER: Record<PositionLevel, Bilingual> = {
  '0': { en: 'Executive Board — Top Corporate Governance', id: 'Dewan Eksekutif — Tata Kelola Korporat Puncak' },
  I: { en: 'Executive Committee — Division Head / Top Strategic Leadership', id: 'Komite Eksekutif — Kepala Divisi' },
  II: { en: 'Department Head / Senior Manager', id: 'Kepala Departemen / Manajer Senior' },
  III: { en: 'Assistant Department / Manager', id: 'Asisten Departemen / Manajer' },
  IV: { en: 'Assistant Manager', id: 'Asisten Manajer' },
  V: { en: 'Supervisor I / Senior Supervisor', id: 'Supervisor I / Supervisor Senior' },
  VI: { en: 'Supervisor II / Junior Supervisor', id: 'Supervisor II / Supervisor Junior' },
  VII: { en: 'Rank & File I / Senior Staff', id: 'Staf I / Staf Senior' },
  VIII: { en: 'Rank & File II / Junior Staff', id: 'Staf II / Staf Junior' },
}

/**
 * Appraisal v2 §2.3 — the two scorer models, resolved from position.level.
 * Positions exports this fact; Appraisal imports it. Positions never imports
 * anything from hr/appraisal — the dependency arrow points one way (§8.2).
 */
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
