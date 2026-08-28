import type { BadgeProps } from '@/components/ui'
import { LEVEL_TO_SCORER_MODEL, type Position } from '@/types'

export function positionStatusVariant(status: Position['positionStatus']): BadgeProps['variant'] {
  return status === 'active' ? 'success' : 'warning'
}

/** POSITIONS_MASTER_DESIGN.md §2.5 — a dualScorer position with no scorer assigned is a visible dashboard flag, not a hidden bug. */
export function isScorerUnassigned(position: Position): boolean {
  const model = LEVEL_TO_SCORER_MODEL[position.level]
  return model === 'dualScorer' && position.isAppraisable && !position.appraisalScorerPositionId
}
