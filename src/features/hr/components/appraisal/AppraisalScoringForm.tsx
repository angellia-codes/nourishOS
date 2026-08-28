import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, Textarea } from '@/components/ui'
import { AppraisalCriterionScoreCard } from './AppraisalCriterionScoreCard'
import { RATING_BAND_LABELS, type AppraisalCriterion, type CriterionScore, type RatingBand } from '@/types'

export type ScoringMode = 'primaryInput' | 'secondaryInput' | 'readonly'

interface AppraisalScoringFormProps {
  criteria: AppraisalCriterion[]
  criterionScores: CriterionScore[]
  mode: ScoringMode
  finalScore: number | null
  ratingBand: RatingBand | null
  onSubmitPrimary?: (scores: { criterionId: string; score: number; note?: string }[], comment?: string) => void | Promise<void>
  onSubmitSecondary?: (scores: { criterionId: string; score: number; note?: string }[]) => void | Promise<void>
  isSubmitting?: boolean
}

const RATING_BAND_TONE: Record<RatingBand, string> = {
  outstanding: 'text-success',
  excellent: 'text-success',
  good: 'text-foreground',
  needsImprovement: 'text-warning',
  unsatisfactory: 'text-destructive',
}

/**
 * §2.4 — the load-bearing rule this whole component exists to enforce: in
 * `secondaryInput` mode it never reads `criterionScores[].primaryScore` off
 * the doc it was handed, even though that field IS present in the live
 * Firestore document HR can read. The 40% has to be blind to the 60% or the
 * dual-scorer design buys nothing (§2.4's own words). `readonly` mode is the
 * only place both scores ever render side by side.
 */
export function AppraisalScoringForm({
  criteria,
  criterionScores,
  mode,
  finalScore,
  ratingBand,
  onSubmitPrimary,
  onSubmitSecondary,
  isSubmitting,
}: AppraisalScoringFormProps) {
  const [draft, setDraft] = useState<Record<string, { score: number | null; note?: string }>>(() => {
    const initial: Record<string, { score: number | null; note?: string }> = {}
    for (const c of criteria) {
      const existing =
        mode === 'primaryInput'
          ? criterionScores.find((s) => s.criterionId === c.criterionId)
          : undefined // secondaryInput starts blank — never seeded from primaryScore
      initial[c.criterionId] = { score: existing?.primaryScore ?? null, note: existing?.primaryNote ?? undefined }
    }
    return initial
  })
  const [overallComment, setOverallComment] = useState('')

  const scoredCount = Object.values(draft).filter((d) => d.score !== null).length
  const allScored = scoredCount === criteria.length

  function updateScore(criterionId: string, score: number) {
    setDraft((prev) => ({ ...prev, [criterionId]: { ...prev[criterionId], score } }))
  }
  function updateNote(criterionId: string, note: string) {
    setDraft((prev) => ({ ...prev, [criterionId]: { ...prev[criterionId], note } }))
  }

  const payload = useMemo(
    () =>
      criteria.map((c) => ({
        criterionId: c.criterionId,
        score: draft[c.criterionId]?.score as number,
        note: draft[c.criterionId]?.note?.trim() || undefined,
      })),
    [criteria, draft],
  )

  async function handleSubmit() {
    if (!allScored) return
    if (mode === 'primaryInput') await onSubmitPrimary?.(payload, overallComment.trim() || undefined)
    if (mode === 'secondaryInput') await onSubmitSecondary?.(payload)
  }

  if (mode === 'readonly') {
    return (
      <div className="flex flex-col gap-3">
        {criteria
          .sort((a, b) => a.order - b.order)
          .map((c, i) => {
            const s = criterionScores.find((cs) => cs.criterionId === c.criterionId)
            return (
              <Card key={c.criterionId} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {c.label.en}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.description.en}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-foreground">Primary {s?.primaryScore ?? '—'}/10</p>
                    <p className="text-muted-foreground">Secondary {s?.secondaryScore ?? '—'}/10</p>
                  </div>
                </div>
              </Card>
            )
          })}

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-foreground">Final Score</p>
              {ratingBand && <Badge variant="neutral">{RATING_BAND_LABELS[ratingBand]}</Badge>}
            </div>
            <p className={`text-3xl font-semibold ${ratingBand ? RATING_BAND_TONE[ratingBand] : 'text-muted-foreground'}`}>
              {finalScore !== null ? finalScore.toFixed(1) : '—'}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ 100</span>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{scoredCount} of {criteria.length} criteria scored</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-200"
            style={{ width: `${(scoredCount / Math.max(criteria.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      {criteria
        .sort((a, b) => a.order - b.order)
        .map((c, i) => (
          <AppraisalCriterionScoreCard
            key={c.criterionId}
            index={i + 1}
            criterion={c}
            score={draft[c.criterionId]?.score ?? null}
            note={draft[c.criterionId]?.note}
            onScoreChange={(score) => updateScore(c.criterionId, score)}
            onNoteChange={(note) => updateNote(c.criterionId, note)}
          />
        ))}

      {mode === 'primaryInput' && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="text-sm font-medium text-foreground">Overall Comment</p>
            <Textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Summary feedback for this review period (optional)…"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={!allScored} loading={isSubmitting}>
          {mode === 'primaryInput' ? 'Submit my score' : 'Submit HR score (40%)'}
        </Button>
      </div>
    </div>
  )
}
