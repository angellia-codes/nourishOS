import { Card, Textarea } from '@/components/ui'
import { ScoreSelector } from './ScoreSelector'
import type { AppraisalSubject, AppraisalScore } from '@/types'

interface AppraisalSubjectCardProps {
  index: number
  subject: AppraisalSubject
  score: AppraisalScore | null
  note?: string
  onScoreChange: (score: AppraisalScore) => void
  onNoteChange: (note: string) => void
  disabled?: boolean
}

const LOW_SCORE_THRESHOLD = 2

export function AppraisalSubjectCard({
  index,
  subject,
  score,
  note,
  onScoreChange,
  onNoteChange,
  disabled,
}: AppraisalSubjectCardProps) {
  const needsNote = score !== null && score <= LOW_SCORE_THRESHOLD

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-xs font-semibold text-foreground">
            {index}
          </span>
          <div>
            <p className="font-medium text-foreground">{subject.label}</p>
            {subject.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subject.description}</p>
            )}
          </div>
        </div>
        <ScoreSelector value={score} onChange={onScoreChange} subjectLabel={subject.label} disabled={disabled} />
      </div>

      {needsNote && (
        <div className="mt-4 pl-9">
          <Textarea
            placeholder="What would help here? This feeds directly into the AI training suggestions."
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
