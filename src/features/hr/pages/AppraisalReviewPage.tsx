import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@/components/ui'
import { FileUpload, FileList } from '@/components/shared'
import {
  AppraisalReviewForm,
  AppraisalStatusBadge,
  AppraisalAIInsights,
  AppraisalScoringForm,
  AppraisalAcknowledgementView,
  type ScoringMode,
} from '@/features/hr/components/appraisal'
import { useAppraisalReview } from '@/features/hr/hooks/useAppraisalReview'
import { useToast, useFirestoreQuery, useAuth, usePermissions } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import type { FileMetadata, AppraisalV1 } from '@/types'

export function AppraisalReviewPage() {
  const { appraisalId } = useParams<{ appraisalId: string }>()
  const { profile } = useAuth()
  const { can } = usePermissions()
  const {
    appraisal,
    template,
    loading,
    isPrimaryScorer,
    isSecondaryScorer,
    isSubmittingPrimary,
    isSubmittingSecondary,
    isAcknowledging,
    isGeneratingInsights,
    submitPrimary,
    submitSecondary,
    acknowledge,
    generateInsights,
  } = useAppraisalReview(appraisalId)
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">Loading appraisal…</CardContent>
        </Card>
      </div>
    )
  }

  if (!appraisal) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">Appraisal not found.</CardContent>
        </Card>
      </div>
    )
  }

  // v1 — frozen/historical, read-only. isDraft is always false on a real v1
  // doc in practice (nobody creates new v1 drafts), so the old form already
  // renders read-only with no functional submit path.
  if (appraisal.scoringModelVersion !== 2) {
    const v1Appraisal = appraisal as unknown as AppraisalV1
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Badge variant="neutral">Legacy 1-5 scale (v1) — historical record</Badge>
        <AppraisalReviewForm
          employeeName={v1Appraisal.employeeId}
          positionLabel={v1Appraisal.positionId}
          reviewType={v1Appraisal.reviewType}
          periodLabel={v1Appraisal.periodLabel}
          status={v1Appraisal.status}
          subjects={[]}
          initialScores={v1Appraisal.subjectScores}
          initialOverallComment={v1Appraisal.overallComment}
          aiInsights={v1Appraisal.aiInsights}
          onSubmit={() => toast.error('v1 appraisals are read-only.')}
          onGenerateInsights={() => void handleGenerateInsights()}
          isGeneratingInsights={isGeneratingInsights}
        />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">Loading template…</CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmitPrimary(scores: { criterionId: string; score: number; note?: string }[], comment?: string) {
    try {
      await submitPrimary(scores, comment)
      toast.success(appraisal!.scorerModel === 'soloScorer' ? 'Scoring closed.' : 'Submitted — awaiting HR scoring.')
    } catch {
      toast.error('Failed to submit. Please try again.')
    }
  }

  async function handleSubmitSecondary(scores: { criterionId: string; score: number; note?: string }[]) {
    try {
      await submitSecondary(scores)
      toast.success('Submitted for GM approval.')
    } catch {
      toast.error('Failed to submit. Please try again.')
    }
  }

  async function handleAcknowledge(signatureFileId?: string, witnessedByUid?: string) {
    try {
      await acknowledge(signatureFileId, witnessedByUid)
      toast.success('Appraisal acknowledged.')
    } catch {
      toast.error('Failed to acknowledge. Please try again.')
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

  let mode: ScoringMode = 'readonly'
  if (appraisal.status === 'draft' && isPrimaryScorer) mode = 'primaryInput'
  else if (appraisal.status === 'submitted' && isSecondaryScorer) mode = 'secondaryInput'

  const isSelfAcknowledging = Boolean(
    profile?.employeeId && profile.employeeId === appraisal.employeeId && appraisal.scorerModel === 'soloScorer',
  )
  const canOperateAcknowledgement =
    appraisal.status === 'approved' &&
    !appraisal.acknowledgement &&
    (isSelfAcknowledging || can(PERMISSIONS.APPRAISALS_ACKNOWLEDGE))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{appraisal.employeeId}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.positionId} &middot; {appraisal.reviewType} &middot; {appraisal.periodLabel} &middot;{' '}
            {appraisal.scorerModel === 'dualScorer' ? 'Dept Head 60% + HR 40%' : 'GM 100%'}
          </p>
        </div>
        <AppraisalStatusBadge status={appraisal.status} />
      </div>

      <AppraisalScoringForm
        criteria={template.criteria}
        criterionScores={appraisal.criterionScores}
        mode={mode}
        finalScore={appraisal.finalScore}
        ratingBand={appraisal.ratingBand}
        onSubmitPrimary={handleSubmitPrimary}
        onSubmitSecondary={handleSubmitSecondary}
        isSubmitting={isSubmittingPrimary || isSubmittingSecondary}
      />

      {canOperateAcknowledgement && (
        <AppraisalAcknowledgementView
          appraisalId={appraisal.id}
          finalScore={appraisal.finalScore}
          ratingBand={appraisal.ratingBand}
          overallComment={appraisal.overallComment}
          isSelfAcknowledging={isSelfAcknowledging}
          onAcknowledge={handleAcknowledge}
          isSubmitting={isAcknowledging}
        />
      )}

      <AppraisalAIInsights
        insights={appraisal.aiInsights}
        onGenerate={() => void handleGenerateInsights()}
        isGenerating={isGeneratingInsights}
        canGenerate={appraisal.status !== 'draft'}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supporting Documents</CardTitle>
          <CardDescription>Signed forms, photos, or other evidence for this review. Optional.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mode !== 'readonly' && <FileUpload module="hr" resourceType="appraisal" resourceId={appraisal.id} />}
          <FileList files={attachments} />
        </CardContent>
      </Card>
    </div>
  )
}
