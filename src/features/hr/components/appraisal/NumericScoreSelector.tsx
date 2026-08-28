import { cn } from '@/lib/utils'

interface NumericScoreSelectorProps {
  value: number | null
  onChange: (score: number) => void
  criterionLabel: string
  disabled?: boolean
}

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1)

/** appraisal-v2-design.md §3.2 — the 1-10 criterion scale, distinct from v1's 1-5 named-label scale (ScoreSelector.tsx, unchanged, still used for historical v1 rendering). */
export function NumericScoreSelector({ value, onChange, criterionLabel, disabled }: NumericScoreSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label={`Score for ${criterionLabel}`}
      className="flex flex-wrap justify-end gap-1"
    >
      {SCORES.map((score) => {
        const isSelected = value === score
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${score} of 10`}
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150',
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
  )
}
