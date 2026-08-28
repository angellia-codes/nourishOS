import { onCall } from 'firebase-functions/v2/https'
import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  ANTHROPIC_API_KEY,
} from '../../lib'
import type { AppraisalCriterion } from './types'

const MIN_CRITERIA = 6
const MAX_CRITERIA = 8

interface GeneratedCriterion {
  label: { en: string; id: string }
  description: { en: string; id: string }
  sourceResponsibilityIds: string[]
  isLeadershipCriterion: boolean
}

interface GenerationOutput {
  criteria: GeneratedCriterion[]
}

const GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    criteria: {
      type: 'array',
      minItems: MIN_CRITERIA,
      maxItems: MAX_CRITERIA,
      items: {
        type: 'object',
        properties: {
          label: {
            type: 'object',
            properties: { en: { type: 'string' }, id: { type: 'string' } },
            required: ['en', 'id'],
            additionalProperties: false,
          },
          description: {
            type: 'object',
            description: 'Observable behaviour, not a restatement of the responsibility text.',
            properties: { en: { type: 'string' }, id: { type: 'string' } },
            required: ['en', 'id'],
            additionalProperties: false,
          },
          sourceResponsibilityIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Must be drawn only from the provided responsibilityId list.',
          },
          isLeadershipCriterion: { type: 'boolean' },
        },
        required: ['label', 'description', 'sourceResponsibilityIds', 'isLeadershipCriterion'],
        additionalProperties: false,
      },
    },
  },
  required: ['criteria'],
  additionalProperties: false,
} as const

/**
 * appraisal-v2-design.md §6.1 — AI draft from Key Responsibilities only,
 * reusing the exact structured-output pattern generateAppraisalInsights.ts
 * already established. Never writes `approved` — §6.2's HR gate is a
 * separate callable (approveAppraisalTemplate.ts).
 */
export const generateAppraisalTemplate = onCall(
  { region: REGION, secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    try {
      const user = await requireActiveUser(request)
      requirePermission(user, PERMISSIONS.APPRAISAL_TEMPLATES_GENERATE)

      const { positionId } = (request.data ?? {}) as { positionId?: string }
      if (!positionId) {
        throw new AppError('invalid-argument', 'positionId is required.')
      }

      const positionSnap = await db.collection(COLLECTIONS.POSITIONS).doc(positionId).get()
      if (!positionSnap.exists) {
        throw new AppError('not-found', 'Position not found.')
      }
      const position = positionSnap.data()!
      if (!position.isAppraisable) {
        throw new AppError('failed-precondition', 'This position is not appraisable (Trainee, DW, OJT, or Level 0).')
      }
      const responsibilities = (position.keyResponsibilities as {
        responsibilityId: string
        text: { en: string; id: string }
        isRemoved: boolean
      }[]).filter((r) => !r.isRemoved)
      if (position.positionStatus === 'draft' && responsibilities.length === 0) {
        throw new AppError(
          'failed-precondition',
          'This position has no Key Responsibilities yet — author the JD content first.',
        )
      }
      if (responsibilities.length === 0) {
        throw new AppError('failed-precondition', 'This position has no Key Responsibilities to generate criteria from.')
      }

      const responsibilityLines = responsibilities
        .map((r) => `- [${r.responsibilityId}] ${r.text.en}`)
        .join('\n')
      const supervises = (position.supervisesPositionIds as string[] | undefined) ?? []

      // Imported here, not at module scope — see generateAppraisalInsights.ts's
      // identical comment on cold-start / deploy-time discovery cost.
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        system:
          'You write performance appraisal criteria for an Indonesian multi-outlet F&B company. ' +
          'Generate criteria ONLY from the Key Responsibilities provided — never invent duties. ' +
          'Each description must describe OBSERVABLE BEHAVIOUR, not restate the task ' +
          '(e.g. "Prepare monthly COGS reports" -> "Accuracy and timeliness of monthly COGS reporting"). ' +
          'Indonesian text must be genuinely written in Indonesian, not translated word-for-word. ' +
          'At most ONE criterion may have isLeadershipCriterion: true, and only if the position supervises others.',
        output_config: { format: { type: 'json_schema', schema: GENERATION_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              `Position: ${(position.title as { en: string }).en} (Level ${position.level as string}, department ${position.departmentId as string})\n` +
              `Supervises other positions: ${supervises.length > 0 ? 'yes' : 'no'}\n\n` +
              `Key Responsibilities (use the bracketed id as sourceResponsibilityIds — never invent one):\n${responsibilityLines}\n\n` +
              'Generate 6 to 8 appraisal criteria.',
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new AppError('internal', 'The AI response contained no output.')
      }
      const output = JSON.parse(textBlock.text) as GenerationOutput

      const validResponsibilityIds = new Set(responsibilities.map((r) => r.responsibilityId))
      let leadershipUsed = false
      const validated: GeneratedCriterion[] = output.criteria.filter((c) => {
        const ids = c.sourceResponsibilityIds.filter((id) => validResponsibilityIds.has(id))
        if (ids.length === 0) return false // "rejected, not stored" — §6.1
        c.sourceResponsibilityIds = ids
        if (c.isLeadershipCriterion) {
          if (leadershipUsed || supervises.length === 0) c.isLeadershipCriterion = false
          else leadershipUsed = true
        }
        return true
      })

      if (validated.length < MIN_CRITERIA) {
        throw new AppError(
          'internal',
          `The AI generated only ${validated.length} valid criteria (minimum ${MIN_CRITERIA}). Try again.`,
        )
      }

      const criteria: AppraisalCriterion[] = validated.slice(0, MAX_CRITERIA).map((c, index) => ({
        criterionId: randomUUID(),
        label: c.label,
        description: c.description,
        sourceResponsibilityIds: c.sourceResponsibilityIds,
        isLeadershipCriterion: c.isLeadershipCriterion,
        order: index,
      }))

      // §6.2 point 2 — regeneration creates version n+1; the live approved
      // version (if any) is untouched until the new draft is itself approved.
      const existingSnap = await db
        .collection(COLLECTIONS.APPRAISAL_TEMPLATES)
        .where('positionId', '==', positionId)
        .orderBy('version', 'desc')
        .limit(1)
        .get()
      const nextVersion = existingSnap.empty ? 1 : (existingSnap.docs[0].data().version as number) + 1

      const templateRef = db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc()
      await templateRef.set({
        positionId,
        sourcePositionRevision: (position.revision as number | undefined) ?? 1,
        criteria,
        scoringModelVersion: 2,
        generationMethod: 'ai',
        generatedAt: FieldValue.serverTimestamp(),
        templateStatus: 'draft',
        approvedByUid: null,
        approvedAt: null,
        version: nextVersion,
        outletId: null,
        ...newDocumentBaseFields(user.uid),
      })

      await recordAuditEvent({
        eventType: 'AppraisalTemplateGenerated',
        category: 'HR',
        module: 'hr',
        resourceType: 'appraisalTemplate',
        resourceId: templateRef.id,
        action: 'create',
        user,
        metadata: { positionId, criteriaCount: criteria.length, version: nextVersion },
      })

      return successResponse({ templateId: templateRef.id }, 'Template drafted — review before approving.')
    } catch (error) {
      handleError(error)
    }
  },
)
