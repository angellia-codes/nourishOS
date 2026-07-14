import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { AppraisalReviewForm, type AppraisalSubmitPayload } from '@/features/hr/components/appraisal'
import { useAppraisalReview } from '@/features/hr/hooks/useAppraisalReview'
import { useToast } from '@/hooks'

export function AppraisalReviewPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>()
  const { appraisal, template, loading, error, isSubmitting, isGeneratingInsights, submit, generateInsights } =
    useAppraisalReview(appraisalId)
  const toast = useToast()

  async function handleSubmit(payload: AppraisalSubmitPayload) {
    try {
      await submit(payload.subjectScores, payload.overallComment)
      toast.success('Submitted for HR Manager and GM approval.')
    } catch {
      toast.error('Failed to submit. Please try again.')
    }
  }

  async function handleGenerateInsights() {
    try {
      await generateInsights()
      toast.success('AI insights generated.')
    } catch {
      toast.error('Failed to generate AI insights. Please try again.')
    }
  }

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
        onSubmit={handleSubmit}
        onGenerateInsights={handleGenerateInsights}
        isSubmitting={isSubmitting}
        isGeneratingInsights={isGeneratingInsights}
      />
    </div>
  )
}
