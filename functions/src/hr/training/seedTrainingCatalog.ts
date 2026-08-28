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
  type AuthedUser,
} from '../../lib'
import seedData from './seedData/training-seed-data.json'

/** Firestore caps a batch at 500 writes; the seed is 425 documents across three collections. */
const BATCH_LIMIT = 400

interface SeedResult {
  created: number
  skipped: number
}

/**
 * training-module-spec-v1.0.md §10 step 3 — the one-time ingestion of the
 * normalised master sheet: 11 departments, 197 canonical topics, 217
 * department bindings.
 *
 * Idempotent in the same way seedPositions is: doc id = the seed's own id, and
 * an id that already exists is skipped rather than overwritten, so re-running
 * after HR has edited content in-app only fills in what is new. That is also
 * what makes it safe to expose as a button.
 */
export const seedTrainingCatalog = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.TRAINING_MANAGE)

    const departments = await seedCollection(COLLECTIONS.DEPARTMENTS, seedData.departments, user)
    const topics = await seedCollection(COLLECTIONS.TRAINING_TOPICS, seedData.trainingTopics, user)
    const bindings = await seedCollection(COLLECTIONS.TRAINING_BINDINGS, seedData.trainingBindings, user)

    const created = departments.created + topics.created + bindings.created

    await recordAuditEvent({
      eventType: 'TrainingCatalogueSeeded',
      category: 'HR',
      module: 'hr',
      resourceType: 'trainingCatalogue',
      resourceId: 'seed',
      action: 'create',
      user,
      newValues: { departments, topics, bindings },
    })

    return successResponse(
      { departments, topics, bindings },
      created > 0 ? `Seeded ${created} new records.` : 'Catalogue already up to date.',
    )
  } catch (error) {
    return handleError(error)
  }
})

async function seedCollection(
  collectionName: string,
  rows: { id: string }[],
  user: AuthedUser,
): Promise<SeedResult> {
  const existingSnap = await db.collection(collectionName).select().get()
  const existingIds = new Set(existingSnap.docs.map((doc) => doc.id))

  const pending = rows.filter((row) => !existingIds.has(row.id))

  for (let index = 0; index < pending.length; index += BATCH_LIMIT) {
    const batch = db.batch()
    for (const { id, ...fields } of pending.slice(index, index + BATCH_LIMIT)) {
      // The seed carries its own `status: 'active'`, which is also
      // newDocumentBaseFields' default — spread the stamps last so createdAt /
      // isArchived are present without the row being able to override them.
      batch.set(db.collection(collectionName).doc(id), { ...fields, ...newDocumentBaseFields(user.uid) })
    }
    await batch.commit()
  }

  return { created: pending.length, skipped: rows.length - pending.length }
}
