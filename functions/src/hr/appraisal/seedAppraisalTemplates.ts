import { onCall } from 'firebase-functions/v2/https'
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
} from '../../lib'

interface TemplateSeedInput {
  positionId: string
  positionLabel: string
  reviewType: 'probation' | 'quarterly' | 'annual'
  subjects: { subjectId: string; label: string; description?: string }[]
}

const REVIEW_TYPES = ['probation', 'quarterly', 'annual'] as const

/**
 * One-time/admin seeding of `appraisalTemplates`. The seed CONTENT lives in
 * src/constants/appraisalTemplateSeeds.ts (frontend, where it's code-reviewed);
 * functions/ can't import from src/, so the caller sends that array as the
 * payload. Gated by APPRAISALS_MANAGE_TEMPLATES, and existing
 * (positionId, reviewType) pairs are skipped — re-running is safe and never
 * overwrites live templates (edit those via a future Settings UI + versioning).
 */
export const seedAppraisalTemplates = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_MANAGE_TEMPLATES)

    const { templates } = (request.data ?? {}) as { templates?: TemplateSeedInput[] }
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new AppError('invalid-argument', 'templates must be a non-empty array of template seeds.')
    }

    for (const t of templates) {
      if (
        !t.positionId ||
        !t.positionLabel ||
        !REVIEW_TYPES.includes(t.reviewType) ||
        !Array.isArray(t.subjects) ||
        t.subjects.length === 0 ||
        t.subjects.some((s) => !s.subjectId || !s.label)
      ) {
        throw new AppError(
          'invalid-argument',
          `Invalid template seed for "${t.positionId ?? '?'}/${t.reviewType ?? '?'}" — positionId, positionLabel, reviewType, and non-empty subjects are required.`,
        )
      }
    }

    const existingSnap = await db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).where('isArchived', '==', false).get()
    const existingKeys = new Set(existingSnap.docs.map((doc) => `${doc.data().positionId}/${doc.data().reviewType}`))

    const batch = db.batch()
    let created = 0
    let skipped = 0

    for (const t of templates) {
      if (existingKeys.has(`${t.positionId}/${t.reviewType}`)) {
        skipped += 1
        continue
      }
      batch.set(db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(), {
        positionId: t.positionId,
        positionLabel: t.positionLabel,
        reviewType: t.reviewType,
        subjects: t.subjects.map((s) => ({
          subjectId: s.subjectId,
          label: s.label,
          description: s.description ?? null,
        })),
        version: 1,
        ...newDocumentBaseFields(user.uid),
      })
      created += 1
    }

    if (created > 0) {
      await batch.commit()
    }

    await recordAuditEvent({
      eventType: 'AppraisalTemplatesSeeded',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisalTemplate',
      resourceId: 'seed',
      action: 'seed',
      user,
      metadata: { created, skipped },
    })

    return successResponse({ created, skipped }, `Seeded ${created} template(s), skipped ${skipped} existing.`)
  } catch (error) {
    handleError(error)
  }
})
