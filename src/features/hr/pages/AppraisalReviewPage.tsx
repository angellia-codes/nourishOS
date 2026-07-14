import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { AppraisalReviewForm } from '@/features/hr/components/appraisal'
import { useAppraisalReview } from '@/features/hr/hooks/useAppraisalReview'

export function AppraisalReviewPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>()
  const { appraisal, template, loading, error, isSubmitting, isGeneratingInsights, submit, generateInsights } =
    useAppraisalReview(appraisalId)

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">Loading appraisal…</CardContent>
        </Card>
      </div>
    )
  }

  if (!appraisal || !template) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {error ?? 'Appraisal not found.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <AppraisalReviewForm
        // TODO: resolve employeeId -> display name once the HR Employee
        // Database module exists. Showing the raw ID is honest for now
        // rather than guessing at a name format.
        employeeName={appraisal.employeeId}
        positionLabel={template.positionLabel}
        reviewType={appraisal.reviewType}
        periodLabel={appraisal.periodLabel}
        status={appraisal.status}
        subjects={template.subjects}
        initialScores={appraisal.subjectScores}
        initialOverallComment={appraisal.overallComment}
        aiInsights={appraisal.aiInsights}
        onSubmit={({ subjectScores, overallComment }) => submit(subjectScores, overallComment)}
        onGenerateInsights={generateInsights}
        isSubmitting={isSubmitting}
        isGeneratingInsights={isGeneratingInsights}
      />
    </div>
  )
}
