import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'
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

      const subjectScores = appraisal.subjectScores as
        | { subjectId: string; score: number; reviewerNote?: string }[]
        | undefined
      if (!subjectScores || subjectScores.length === 0) {
        throw new AppError('failed-precondition', 'This appraisal has no submitted scores yet.')
      }

      // Resolve subject labels from the template so the model sees human
      // criteria names, not internal subjectIds.
      const templateSnap = await db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(appraisal.templateId).get()
      const subjects = (templateSnap.data()?.subjects ?? []) as { subjectId: string; label: string }[]
      const labelById = new Map(subjects.map((s) => [s.subjectId, s.label]))

      const scoreLines = subjectScores
        .map((s) => {
          const label = labelById.get(s.subjectId) ?? s.subjectId
          const note = s.reviewerNote ? ` — reviewer note: ${s.reviewerNote}` : ''
          return `- ${label}: ${s.score}/5${note}`
        })
        .join('\n')

      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system:
          'You are an HR development advisor for an Indonesian multi-outlet F&B company. ' +
          'You receive one employee performance appraisal (scores 1-5 per criterion, 5 is best). ' +
          'Respond with practical, respectful, specific development guidance. Do not mention names or invent facts.',
        output_config: { format: { type: 'json_schema', schema: INSIGHTS_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              `Position: ${appraisal.positionId}\n` +
              `Review type: ${appraisal.reviewType} (${appraisal.periodLabel})\n` +
              `Overall score: ${appraisal.overallScore}/5\n` +
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
