import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { AppraisalReviewForm } from '@/features/hr/components/appraisal'
import { APPRAISAL_TEMPLATE_SEEDS } from '@/constants'
import type { ApprovalStatus } from '@/constants/statuses'
import type { AppraisalAIInsights as AIInsightsData, AppraisalSubjectScore } from '@/types'

/**
 * TEMPORARY preview harness (supersedes the Milestone 1 placeholder).
 *
 * Renders the real AppraisalReviewForm against real seed data with local
 * state simulating the backend — no Firebase calls, since there's no auth
 * session until Milestone 4. Once routing + auth exist, this becomes the
 * actual AppraisalReviewPage wired to useAppraisalReview().
 *
 * From Milestone 4 onward, THIS file's job goes back to ONLY composing
 * providers and mounting the router:
 *
 *   <ThemeProvider><AuthProvider><AppRouter /></AuthProvider></ThemeProvider>
 */
function App() {
  const template = APPRAISAL_TEMPLATE_SEEDS.find((t) => t.positionId === 'waiter' && t.reviewType === 'quarterly')!

  const [status, setStatus] = useState<ApprovalStatus>('draft')
  const [aiInsights, setAiInsights] = useState<AIInsightsData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  function handleSubmit(scores: AppraisalSubjectScore[]) {
    setIsSubmitting(true)
    // eslint-disable-next-line no-console
    console.log('Submitted scores (mock — no Firebase call):', scores)
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
          'This is mock preview data. Once wired to generateAppraisalInsights() in Milestone 4, this panel shows real Claude-generated training suggestions and a development comment based on the actual scores above.',
        generatedAt: Timestamp.now(),
        generatedBy: 'mock-preview',
      })
      setIsGenerating(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Preview harness — mock data, no Firebase calls. Replaced by real routing + auth in Milestone 4.
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

export default App
