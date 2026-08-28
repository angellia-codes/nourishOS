import type { RatingBand } from './types'

/**
 * §4.1 — evaluated on the UNROUNDED finalScore using >=. This is a
 * substantive rule, not a rounding detail: 89.6 is Excellent, not
 * Outstanding, because F-HR-APR-001's integer band ranges leave 89.1-89.9
 * undefined and this is what closes that gap.
 */
export function computeRatingBand(finalScore: number): RatingBand {
  if (finalScore >= 90) return 'outstanding'
  if (finalScore >= 75) return 'excellent'
  if (finalScore >= 60) return 'good'
  if (finalScore >= 45) return 'needsImprovement'
  return 'unsatisfactory'
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length
}

interface ScoreComputationInput {
  primaryScores: number[]
  secondaryScores: number[] // empty for soloScorer
  scorerModel: 'dualScorer' | 'soloScorer'
}

/** §4 — server-side only, inside a transaction at the call site. Never accepts a client-set weightedScore/finalScore. */
export function computeFinalScore({ primaryScores, secondaryScores, scorerModel }: ScoreComputationInput): {
  primaryAverage: number
  secondaryAverage: number | null
  finalScore: number
  ratingBand: RatingBand
} {
  const weighted =
    scorerModel === 'dualScorer'
      ? primaryScores.map((p, i) => p * 0.6 + secondaryScores[i] * 0.4)
      : primaryScores.slice()

  const primaryAverage = mean(primaryScores) ?? 0
  const secondaryAverage = scorerModel === 'dualScorer' ? mean(secondaryScores) : null
  const finalScore = (mean(weighted) ?? 0) * 10

  return { primaryAverage, secondaryAverage, finalScore, ratingBand: computeRatingBand(finalScore) }
}
