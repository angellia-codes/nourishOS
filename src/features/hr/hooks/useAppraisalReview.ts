import { useCallback, useEffect, useState } from 'react'
import * as appraisalService from '@/features/hr/services/appraisalService'
import { useFirestoreDoc, useAsync, useAuth } from '@/hooks'
import { COLLECTIONS } from '@/constants'
import type { Appraisal, AppraisalTemplate } from '@/types'

interface CriterionScoreInput {
  criterionId: string
  score: number
  note?: string
}

/**
 * v2 rewrite — composes useFirestoreDoc (live appraisal) + a one-shot
 * template lookup, same shape as the v1 hook. §2.4 is enforced simply by
 * this hook never fetching the DH's scores for the HR caller — there is no
 * subscribeToSecondaryScores here, only submitSecondaryScores.
 */
export function useAppraisalReview(appraisalId: string | undefined) {
  const { user } = useAuth()
  const { data: appraisal, loading } = useFirestoreDoc<Appraisal>(COLLECTIONS.APPRAISALS, appraisalId)

  const [template, setTemplate] = useState<AppraisalTemplate | null>(null)

  useEffect(() => {
    if (!appraisal) {
      setTemplate(null)
      return
    }
    let cancelled = false
    appraisalService.getAppraisalTemplate(appraisal.templateId).then((result) => {
      if (!cancelled) setTemplate(result)
    })
    return () => {
      cancelled = true
    }
  }, [appraisal?.templateId])

  const submitPrimaryAsync = useAsync(appraisalService.submitPrimaryScores)
  const submitSecondaryAsync = useAsync(appraisalService.submitSecondaryScores)
  const acknowledgeAsync = useAsync(appraisalService.acknowledgeAppraisal)
  const generateInsightsAsync = useAsync(appraisalService.generateAppraisalInsights)

  const submitPrimary = useCallback(
    (criterionScores: CriterionScoreInput[], overallComment?: string) => {
      if (!appraisalId) return Promise.resolve()
      return submitPrimaryAsync.execute({ appraisalId, criterionScores, overallComment })
    },
    [appraisalId, submitPrimaryAsync],
  )

  const submitSecondary = useCallback(
    (criterionScores: CriterionScoreInput[]) => {
      if (!appraisalId) return Promise.resolve()
      return submitSecondaryAsync.execute({ appraisalId, criterionScores })
    },
    [appraisalId, submitSecondaryAsync],
  )

  const acknowledge = useCallback(
    (signatureFileId?: string, witnessedByUid?: string) => {
      if (!appraisalId) return Promise.resolve()
      return acknowledgeAsync.execute({ appraisalId, signatureFileId, witnessedByUid })
    },
    [appraisalId, acknowledgeAsync],
  )

  const generateInsights = useCallback(() => {
    if (!appraisalId) return Promise.resolve()
    return generateInsightsAsync.execute(appraisalId)
  }, [appraisalId, generateInsightsAsync])

  const isPrimaryScorer = Boolean(appraisal && user && appraisal.primaryScorerUid === user.uid)
  const isSecondaryScorer = Boolean(appraisal && user && appraisal.secondaryScorerUid === user.uid)

  return {
    appraisal,
    template,
    loading,
    isPrimaryScorer,
    isSecondaryScorer,
    error:
      submitPrimaryAsync.error?.message ??
      submitSecondaryAsync.error?.message ??
      acknowledgeAsync.error?.message ??
      generateInsightsAsync.error?.message ??
      null,
    isSubmittingPrimary: submitPrimaryAsync.loading,
    isSubmittingSecondary: submitSecondaryAsync.loading,
    isAcknowledging: acknowledgeAsync.loading,
    isGeneratingInsights: generateInsightsAsync.loading,
    submitPrimary,
    submitSecondary,
    acknowledge,
    generateInsights,
  }
}
