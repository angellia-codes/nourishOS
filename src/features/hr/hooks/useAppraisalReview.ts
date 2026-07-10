import { useCallback, useEffect, useState } from 'react'
import * as appraisalService from '@/features/hr/services/appraisalService'
import type { Appraisal, AppraisalTemplate, AppraisalSubjectScore } from '@/types'

/**
 * Manages its own loading/error/submitting state for now — this is
 * exactly the shape the shared useAsync/useFirestoreDoc hooks (Milestone 5)
 * will formalize, so expect this to get thinner once those exist rather
 * than duplicating that pattern per-feature indefinitely.
 */
export function useAppraisalReview(appraisalId: string | undefined) {
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null)
  const [template, setTemplate] = useState<AppraisalTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)

  useEffect(() => {
    if (!appraisalId) {
      setLoading(false)
      return
    }
    setLoading(true)
    return appraisalService.subscribeToAppraisal(appraisalId, (doc) => {
      setAppraisal(doc)
      setLoading(false)
    })
  }, [appraisalId])

  useEffect(() => {
    if (!appraisal) {
      setTemplate(null)
      return
    }
    let cancelled = false
    appraisalService.getAppraisalTemplate(appraisal.positionId, appraisal.reviewType).then((result) => {
      if (!cancelled) setTemplate(result)
    })
    return () => {
      cancelled = true
    }
  }, [appraisal?.positionId, appraisal?.reviewType])

  const submit = useCallback(
    async (subjectScores: AppraisalSubjectScore[]) => {
      if (!appraisalId) return
      setIsSubmitting(true)
      setError(null)
      try {
        await appraisalService.submitAppraisal({ appraisalId, subjectScores })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit appraisal.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [appraisalId],
  )

  const generateInsights = useCallback(async () => {
    if (!appraisalId) return
    setIsGeneratingInsights(true)
    setError(null)
    try {
      await appraisalService.generateAppraisalInsights(appraisalId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI insights.')
    } finally {
      setIsGeneratingInsights(false)
    }
  }, [appraisalId])

  return { appraisal, template, loading, error, isSubmitting, isGeneratingInsights, submit, generateInsights }
}
