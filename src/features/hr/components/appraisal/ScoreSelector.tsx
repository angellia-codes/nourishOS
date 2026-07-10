import { useState } from 'react'
import { cn } from '@/lib/utils'
import { APPRAISAL_SCORE_LABELS, type AppraisalScore } from '@/types'

interface ScoreSelectorProps {
  value: AppraisalScore | null
  onChange: (score: AppraisalScore) => void
  subjectLabel: string
  disabled?: boolean
}

const SCORES: AppraisalScore[] = [1, 2, 3, 4, 5]

export function ScoreSelector({ value, onChange, subjectLabel, disabled }: ScoreSelectorProps) {
  const [hovered, setHovered] = useState<AppraisalScore | null>(null)
  const displayed = hovered ?? value

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div
        role="radiogroup"
        aria-label={`Score for ${subjectLabel}`}
        className="flex gap-1.5"
        onMouseLeave={() => setHovered(null)}
      >
        {SCORES.map((score) => {
          const isSelected = value === score
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${score} - ${APPRAISAL_SCORE_LABELS[score]}`}
              disabled={disabled}
              onMouseEnter={() => setHovered(score)}
              onFocus={() => setHovered(score)}
              onBlur={() => setHovered(null)}
              onClick={() => onChange(score)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {score}
            </button>
          )
        })}
      </div>
      <span
        className={cn(
          'h-4 text-xs transition-opacity duration-150',
          displayed ? 'text-muted-foreground opacity-100' : 'opacity-0',
        )}
      >
        {displayed ? APPRAISAL_SCORE_LABELS[displayed] : '\u2014'}
      </span>
    </div>
  )
}
