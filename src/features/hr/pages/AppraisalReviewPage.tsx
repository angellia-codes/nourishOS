import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { FileUpload, FileList } from '@/components/shared'
import { AppraisalReviewForm, type AppraisalSubmitPayload } from '@/features/hr/components/appraisal'
import { useAppraisalReview } from '@/features/hr/hooks/useAppraisalReview'
import { useToast, useFirestoreQuery } from '@/hooks'
import { COLLECTIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import type { FileMetadata } from '@/types'

export function AppraisalReviewPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>()
  const { appraisal, template, loading, error, isSubmitting, isGeneratingInsights, submit, generateInsights } =
    useAppraisalReview(appraisalId)
  const toast = useToast()

  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    appraisalId
      ? [
          where('resourceType', '==', 'appraisal'),
          where('resourceId', '==', appraisalId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [appraisalId],
  )

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
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

      {/*
        Demonstrates the generic File Storage service against a real
        resource — no Appraisal-specific Cloud Function or schema change
        needed, since files reference their owner via module/resourceType/
        resourceId rather than a back-reference array on the Appraisal doc.
      */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supporting Documents</CardTitle>
          <CardDescription>Signed forms, photos, or other evidence for this review. Optional.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {appraisal.status === 'draft' && (
            <FileUpload module="hr" resourceType="appraisal" resourceId={appraisal.id} />
          )}
          <FileList files={attachments} />
        </CardContent>
      </Card>
    </div>
  )
}
