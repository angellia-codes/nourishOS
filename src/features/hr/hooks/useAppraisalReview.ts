import { useCallback, useEffect, useState } from 'react'
import * as appraisalService from '@/features/hr/services/appraisalService'
import { useFirestoreDoc, useAsync } from '@/hooks'
import { COLLECTIONS } from '@/constants'
import type { Appraisal, AppraisalTemplate, AppraisalSubjectScore } from '@/types'

/**
 * Thinner than its Milestone 3 version — now composes the generic
 * useFirestoreDoc (live appraisal doc) and useAsync (submit / generate
 * insights) instead of hand-rolling the same loading/error state here.
 * The template lookup stays a local effect since it's a one-shot fetch
 * keyed off a field of the (already-subscribed) appraisal doc, not a
 * subscription of its own.
 */
export function useAppraisalReview(appraisalId: string | undefined) {
  const { data: appraisal, loading } = useFirestoreDoc<Appraisal>(COLLECTIONS.APPRAISALS, appraisalId)

  const [template, setTemplate] = useState<AppraisalTemplate | null>(null)

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

  const submitAsync = useAsync(appraisalService.submitAppraisal)
  const generateInsightsAsync = useAsync(appraisalService.generateAppraisalInsights)

  const submit = useCallback(
    (subjectScores: AppraisalSubjectScore[], overallComment?: string) => {
      if (!appraisalId) return Promise.resolve()
      return submitAsync.execute({ appraisalId, subjectScores, overallComment })
    },
    [appraisalId, submitAsync],
  )

  const generateInsights = useCallback(() => {
    if (!appraisalId) return Promise.resolve()
    return generateInsightsAsync.execute(appraisalId)
  }, [appraisalId, generateInsightsAsync])

  return {
    appraisal,
    template,
    loading,
    error: submitAsync.error?.message ?? generateInsightsAsync.error?.message ?? null,
    isSubmitting: submitAsync.loading,
    isGeneratingInsights: generateInsightsAsync.loading,
    submit,
    generateInsights,
  }
}
