import { Card, Textarea } from '@/components/ui'
import { tOrEn, useLang } from '@/lib/i18n'
import { NumericScoreSelector } from './NumericScoreSelector'
import type { AppraisalCriterion } from '@/types'

interface AppraisalCriterionScoreCardProps {
  index: number
  criterion: AppraisalCriterion
  score: number | null
  note?: string
  onScoreChange: (score: number) => void
  onNoteChange: (note: string) => void
  disabled?: boolean
}

const LOW_SCORE_THRESHOLD = 4

/** One criterion, one scorer's own input — never renders the other party's score (§2.4). */
export function AppraisalCriterionScoreCard({
  index,
  criterion,
  score,
  note,
  onScoreChange,
  onNoteChange,
  disabled,
}: AppraisalCriterionScoreCardProps) {
  const lang = useLang()
  const needsNote = score !== null && score <= LOW_SCORE_THRESHOLD

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-xs font-semibold text-foreground">
            {index}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{tOrEn(criterion.label, lang)}</p>
              {criterion.isLeadershipCriterion && (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  Leadership
                </span>
              )}
            </div>
            {tOrEn(criterion.description, lang) && (
              <p className="mt-0.5 text-sm text-muted-foreground">{tOrEn(criterion.description, lang)}</p>
            )}
          </div>
        </div>
        <NumericScoreSelector value={score} onChange={onScoreChange} criterionLabel={tOrEn(criterion.label, lang)} disabled={disabled} />
      </div>

      {needsNote && (
        <div className="mt-4 pl-9">
          <Textarea
            placeholder="What would help here? This feeds into the AI training suggestions."
            value={note ?? ''}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={disabled}
            className="min-h-[64px] text-sm"
          />
        </div>
      )}
    </Card>
  )
}
