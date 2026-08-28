import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  ANTHROPIC_API_KEY,
} from '../../lib'

interface InsightsOutput {
  trainingSuggestions: string[]
  developmentComment: string
}

/** Structured-output schema — guarantees the response parses into InsightsOutput. */
const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    trainingSuggestions: {
      type: 'array',
      items: { type: 'string' },
      description: '3 to 5 concrete, actionable training suggestions for this employee.',
    },
    developmentComment: {
      type: 'string',
      description: 'One short paragraph summarizing strengths and the main development focus.',
    },
  },
  required: ['trainingSuggestions', 'developmentComment'],
  additionalProperties: false,
} as const

/**
 * On-demand only — never triggered automatically on submit (confirmed
 * decision, see src/features/hr/services/appraisalService.ts). Reads the
 * submitted scores, asks Claude for training suggestions + a development
 * comment, and stores the result on the appraisal's aiInsights field.
 */
export const generateAppraisalInsights = onCall(
  { region: REGION, secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    try {
      const user = await requireActiveUser(request)
      requirePermission(user, PERMISSIONS.APPRAISALS_GENERATE_INSIGHTS)

      const { appraisalId } = (request.data ?? {}) as { appraisalId?: string }
      if (!appraisalId) {
        throw new AppError('invalid-argument', 'appraisalId is required.')
      }

      const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId)
      const appraisalSnap = await appraisalRef.get()
      if (!appraisalSnap.exists) {
        throw new AppError('not-found', 'Appraisal not found.')
      }
      const appraisal = appraisalSnap.data()!
      const templateSnap = await db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(appraisal.templateId).get()

      // v2 (criterionScores/criteria, 1-10) vs v1 (subjectScores/subjects,
      // 1-5, frozen/historical-only per §2.8 but still readable, so still
      // eligible for on-demand insight generation).
      let scoreLines: string
      let overallLine: string
      if (appraisal.scoringModelVersion === 2) {
        const criterionScores = (appraisal.criterionScores ?? []) as {
          criterionId: string
          weightedScore: number | null
          primaryNote: string | null
          secondaryNote: string | null
        }[]
        if (criterionScores.every((c) => c.weightedScore === null)) {
          throw new AppError('failed-precondition', 'This appraisal has no submitted scores yet.')
        }
        const criteria = (templateSnap.data()?.criteria ?? []) as { criterionId: string; label: { en: string } }[]
        const labelById = new Map(criteria.map((c) => [c.criterionId, c.label.en]))
        scoreLines = criterionScores
          .map((c) => {
            const label = labelById.get(c.criterionId) ?? c.criterionId
            const note = [c.primaryNote, c.secondaryNote].filter(Boolean).join(' / ')
            return `- ${label}: ${c.weightedScore?.toFixed(1) ?? '—'}/10${note ? ` — ${note}` : ''}`
          })
          .join('\n')
        overallLine = `Final score: ${appraisal.finalScore ?? '—'}/100 (${appraisal.ratingBand ?? 'not yet rated'})`
      } else {
        const subjectScores = (appraisal.subjectScores ?? []) as { subjectId: string; score: number; reviewerNote?: string }[]
        if (subjectScores.length === 0) {
          throw new AppError('failed-precondition', 'This appraisal has no submitted scores yet.')
        }
        const subjects = (templateSnap.data()?.subjects ?? []) as { subjectId: string; label: string }[]
        const labelById = new Map(subjects.map((s) => [s.subjectId, s.label]))
        scoreLines = subjectScores
          .map((s) => {
            const label = labelById.get(s.subjectId) ?? s.subjectId
            const note = s.reviewerNote ? ` — reviewer note: ${s.reviewerNote}` : ''
            return `- ${label}: ${s.score}/5${note}`
          })
          .join('\n')
        overallLine = `Overall score: ${appraisal.overallScore}/5`
      }

      // Imported here, not at module scope: firebase-functions loads this file
      // on every cold start and during deploy-time function discovery, and the
      // SDK costs seconds to require on a slow filesystem — enough to trip the
      // CLI's discovery timeout. Only this one callable needs it.
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system:
          'You are an HR development advisor for an Indonesian multi-outlet F&B company. ' +
          'You receive one employee performance appraisal. Respond with practical, respectful, specific ' +
          'development guidance. Do not mention names or invent facts.',
        output_config: { format: { type: 'json_schema', schema: INSIGHTS_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              `Position: ${appraisal.positionId}\n` +
              `Review type: ${appraisal.reviewType} (${appraisal.periodLabel})\n` +
              `${overallLine}\n` +
              `Reviewer's overall comment: ${appraisal.overallComment ?? '(none)'}\n\n` +
              `Scores:\n${scoreLines}\n\n` +
              'Generate training suggestions and a development comment for this employee.',
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new AppError('internal', 'The AI response contained no output.')
      }
      const insights = JSON.parse(textBlock.text) as InsightsOutput

      await appraisalRef.update({
        aiInsights: {
          trainingSuggestions: insights.trainingSuggestions,
          developmentComment: insights.developmentComment,
          generatedAt: FieldValue.serverTimestamp(),
          generatedBy: user.uid,
        },
        ...updatedFields(user.uid),
      })

      await recordAuditEvent({
        eventType: 'AppraisalInsightsGenerated',
        category: 'HR',
        module: 'hr',
        resourceType: 'appraisal',
        resourceId: appraisalId,
        action: 'generateInsights',
        user,
      })

      return successResponse(insights, 'Insights generated.')
    } catch (error) {
      handleError(error)
    }
  },
)
