import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { AppraisalReviewForm } from '@/features/hr/components/appraisal'
import { APPRAISAL_TEMPLATE_SEEDS } from '@/constants'
import type { ApprovalStatus } from '@/constants/statuses'
import type { AppraisalAIInsights as AIInsightsData, AppraisalSubjectScore } from '@/types'

/**
 * Public on purpose — lets anyone see the review form working without a
 * real Firebase project configured yet. The real thing lives at
 * /hr/appraisals/:appraisalId (AppraisalReviewPage), behind auth.
 */
export function AppraisalDemoPage() {
  const template = APPRAISAL_TEMPLATE_SEEDS.find((t) => t.positionId === 'waiter' && t.reviewType === 'quarterly')!

  const [status, setStatus] = useState<ApprovalStatus>('draft')
  const [aiInsights, setAiInsights] = useState<AIInsightsData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  function handleSubmit(payload: { subjectScores: AppraisalSubjectScore[]; overallComment?: string }) {
    setIsSubmitting(true)
    // eslint-disable-next-line no-console
    console.log('Submitted (mock — no Firebase call):', payload)
    setTimeout(() => {
      setStatus('pending')
      setIsSubmitting(false)
    }, 600)
  }

  function handleGenerateInsights() {
    setIsGenerating(true)
    setTimeout(() => {
      setAiInsights({
        trainingSuggestions: ['Upselling & Suggestive Selling Workshop', 'Menu Knowledge Refresher'],
        developmentComment:
          'This is mock preview data. The real generateAppraisalInsights() Cloud Function calls Claude and returns suggestions based on the actual scores above.',
        generatedAt: Timestamp.now(),
        generatedBy: 'mock-preview',
      })
      setIsGenerating(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version lives at
        /hr/appraisals/:appraisalId.
      </div>
      <AppraisalReviewForm
        employeeName="Ni Made Ayu Ratih"
        positionLabel={template.positionLabel}
        reviewType={template.reviewType}
        periodLabel="Q3 2026"
        status={status}
        subjects={template.subjects}
        aiInsights={aiInsights}
        onSubmit={handleSubmit}
        onGenerateInsights={handleGenerateInsights}
        isSubmitting={isSubmitting}
        isGeneratingInsights={isGenerating}
      />
    </div>
  )
}
