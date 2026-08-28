import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { POSITION_SEEDS } from './positionSeeds'

const EMPTY_BILINGUAL = { en: '', id: '' }

/**
 * Idempotent bulk seed from positionSeeds.ts — POSITIONS_MASTER_DESIGN.md §8.
 * Doc id = positionId (§4: "slug, = doc ID, never regenerated"). Never
 * overwrites an existing doc, so it's safe to re-run after HR has started
 * editing content in-app — a second run only fills in positions added to the
 * seed list since the first run.
 */
export const seedPositions = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.POSITIONS_SEED)

    const existingSnap = await db.collection(COLLECTIONS.POSITIONS).select().get()
    const existingIds = new Set(existingSnap.docs.map((doc) => doc.id))

    let created = 0
    let skipped = 0
    const batch = db.batch()

    for (const seed of POSITION_SEEDS) {
      if (existingIds.has(seed.positionId)) {
        skipped += 1
        continue
      }
      const ref = db.collection(COLLECTIONS.POSITIONS).doc(seed.positionId)

      batch.set(ref, {
        positionId: seed.positionId,
        title: seed.title,
        departmentId: seed.departmentId,
        divisionId: null,
        level: seed.level,
        appraisalScorerPositionId: seed.appraisalScorerPositionId,
        isAppraisable: seed.isAppraisable,
        jobOverview: EMPTY_BILINGUAL,
        keyResponsibilities: [],
        authority: [],
        workingRelationships: { internal: [], external: [] },
        qualifications: {
          education: EMPTY_BILINGUAL,
          experience: EMPTY_BILINGUAL,
          certification: EMPTY_BILINGUAL,
          language: EMPTY_BILINGUAL,
          computerSkills: EMPTY_BILINGUAL,
        },
        knowledge: [],
        skills: { soft: [], hard: [] },
        competencies: [],
        performanceExpectations: EMPTY_BILINGUAL,
        supervisesPositionIds: [],
        supervisesNote: null,
        positionStatus: 'draft',
        revision: 1,
        effectiveDate: null,
        sourceFileId: null,
        isActive: true,
        outletId: null,
        ...newDocumentBaseFields(user.uid),
      })
      created += 1
    }

    if (created > 0) {
      await batch.commit()
    }

    await recordAuditEvent({
      eventType: 'PositionsSeeded',
      category: 'HR',
      module: 'hr',
      resourceType: 'position',
      resourceId: 'seed',
      action: 'seed',
      user,
      metadata: { created, skipped },
    })

    return successResponse({ created, skipped }, `Seeded ${created} position(s), skipped ${skipped} existing.`)
  } catch (error) {
    handleError(error)
  }
})
