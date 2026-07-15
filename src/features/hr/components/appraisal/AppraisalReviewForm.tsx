import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea } from '@/components/ui'
import { AppraisalSubjectCard } from './AppraisalSubjectCard'
import { AppraisalStatusBadge } from './AppraisalStatusBadge'
import { AppraisalAIInsights } from './AppraisalAIInsights'
import type {
  AppraisalSubject,
  AppraisalSubjectScore,
  AppraisalScore,
  AppraisalReviewType,
  AppraisalAIInsights as AIInsightsData,
} from '@/types'
import type { ApprovalStatus } from '@/constants/statuses'

const REVIEW_TYPE_LABELS: Record<AppraisalReviewType, string> = {
  probation: 'Probation Review',
  quarterly: 'Quarterly Review',
  annual: 'Annual Review',
}

interface DraftScore {
  score: AppraisalScore | null
  reviewerNote?: string
}

export interface AppraisalSubmitPayload {
  subjectScores: AppraisalSubjectScore[]
  overallComment?: string
}

export interface AppraisalReviewFormProps {
  employeeName: string
  positionLabel: string
  reviewType: AppraisalReviewType
  periodLabel: string
  status: ApprovalStatus
  subjects: AppraisalSubject[]
  initialScores?: AppraisalSubjectScore[]
  initialOverallComment?: string | null
  aiInsights: AIInsightsData | null
  onSubmit: (payload: AppraisalSubmitPayload) => void | Promise<void>
  onGenerateInsights: () => void | Promise<void>
  isSubmitting?: boolean
  isGeneratingInsights?: boolean
}

export function AppraisalReviewForm({
  employeeName,
  positionLabel,
  reviewType,
  periodLabel,
  status,
  subjects,
  initialScores,
  initialOverallComment,
  aiInsights,
  onSubmit,
  onGenerateInsights,
  isSubmitting,
  isGeneratingInsights,
}: AppraisalReviewFormProps) {
  const isDraft = status === 'draft'
  const [overallComment, setOverallComment] = useState(initialOverallComment ?? '')

  const [draftScores, setDraftScores] = useState<Record<string, DraftScore>>(() => {
    const initial: Record<string, DraftScore> = {}
    for (const subject of subjects) {
      const existing = initialScores?.find((s) => s.subjectId === subject.subjectId)
      initial[subject.subjectId] = { score: existing?.score ?? null, reviewerNote: existing?.reviewerNote }
    }
    return initial
  })

  const scoredEntries = Object.values(draftScores).filter((entry) => entry.score !== null)
  const allScored = scoredEntries.length === subjects.length
  const overallScore =
    scoredEntries.length > 0
      ? scoredEntries.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scoredEntries.length
      : null

  const overallScoreTone = useMemo(() => {
    if (overallScore === null) return 'text-muted-foreground'
    if (overallScore >= 4) return 'text-success'
    if (overallScore >= 3) return 'text-warning'
    return 'text-destructive'
  }, [overallScore])

  function updateScore(subjectId: string, score: AppraisalScore) {
    setDraftScores((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], score } }))
  }

  function updateNote(subjectId: string, note: string) {
    setDraftScores((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], reviewerNote: note } }))
  }

  function handleSubmit() {
    if (!allScored) return
    const scores: AppraisalSubjectScore[] = subjects.map((subject) => {
      const entry = draftScores[subject.subjectId]
      return {
        subjectId: subject.subjectId,
        score: entry.score as AppraisalScore,
        reviewerNote: entry.reviewerNote?.trim() || undefined,
      }
    })
    void onSubmit({ subjectScores: scores, overallComment: overallComment.trim() || undefined })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{employeeName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {positionLabel} &middot; {REVIEW_TYPE_LABELS[reviewType]} &middot; {periodLabel}
          </p>
        </div>
        <AppraisalStatusBadge status={status} />
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {scoredEntries.length} of {subjects.length} subjects scored
          </span>
          {overallScore !== null && (
            <span className={overallScoreTone}>Running average: {overallScore.toFixed(1)} / 5</span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-200"
            style={{ width: `${(scoredEntries.length / Math.max(subjects.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Subjects */}
      <div className="flex flex-col gap-3">
        {subjects.map((subject, i) => (
          <AppraisalSubjectCard
            key={subject.subjectId}
            index={i + 1}
            subject={subject}
            score={draftScores[subject.subjectId]?.score ?? null}
            note={draftScores[subject.subjectId]?.reviewerNote}
            onScoreChange={(score) => updateScore(subject.subjectId, score)}
            onNoteChange={(note) => updateNote(subject.subjectId, note)}
            disabled={!isDraft}
          />
        ))}
      </div>

      {/* Overall score summary */}
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Overall Score</p>
            <p className="text-xs text-muted-foreground">Average across all {subjects.length} subjects</p>
          </div>
          <p className={`text-3xl font-semibold ${overallScoreTone}`}>
            {overallScore !== null ? overallScore.toFixed(1) : '\u2014'}
            <span className="ml-1 text-base font-normal text-muted-foreground">/ 5</span>
          </p>
        </CardContent>
      </Card>

      {/* Overall comment */}
      {(isDraft || overallComment) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Summary feedback for this review period (optional)…"
              disabled={!isDraft}
              className="min-h-[88px]"
            />
          </CardContent>
        </Card>
      )}

      {/* AI Insights — unlocked once submitted */}
      <AppraisalAIInsights
        insights={aiInsights}
        onGenerate={onGenerateInsights}
        isGenerating={Boolean(isGeneratingInsights)}
        canGenerate={!isDraft}
      />

      {/* Submit */}
      {isDraft && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!allScored} loading={isSubmitting}>
            Submit for GM Approval
          </Button>
        </div>
      )}
    </div>
  )
}
