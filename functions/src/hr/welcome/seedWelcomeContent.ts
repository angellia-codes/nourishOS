import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { WELCOME_SECTIONS, type WelcomeSection } from './content'
import { WELCOME_CONTENT_SEEDS } from './welcomeSeeds'

/**
 * welcome-portal.md §7.4 — the one-time seed of the four HR-editable welcome
 * sections, so HR starts from a draft to correct rather than four blank forms.
 *
 * Idempotent the same way seedPositions and seedTrainingCatalog are: doc id =
 * the section id, and a section that already holds a draft or a published
 * version is skipped rather than overwritten. That is what makes it safe to
 * expose as a button HR can press twice.
 *
 * It writes `draft` only, never `published` — the seed copy is a first pass
 * (see welcomeSeeds.ts) and a new hire must not read it before HR has. A
 * section seeded here therefore still shows "Never published" on the editor
 * and still shows the empty notice in the portal until someone presses
 * Publish.
 */
export const seedWelcomeContent = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.WELCOME_MANAGE_CONTENT)

    const seeded: WelcomeSection[] = []
    const skipped: WelcomeSection[] = []
    const batch = db.batch()

    for (const sectionId of WELCOME_SECTIONS) {
      const ref = db.collection(COLLECTIONS.WELCOME_CONTENT).doc(sectionId)
      const snap = await ref.get()
      const existing = snap.data()

      if (existing?.draft || existing?.published) {
        skipped.push(sectionId)
        continue
      }

      const content = WELCOME_CONTENT_SEEDS[sectionId]

      if (snap.exists) {
        // The document exists but holds neither a draft nor a published
        // version — an updateWelcomeContent that created it with an empty body.
        batch.update(ref, { draft: content, ...updatedFields(user.uid) })
      } else {
        batch.set(ref, {
          sectionId,
          draft: content,
          published: null,
          publishedAt: null,
          publishedBy: null,
          ...newDocumentBaseFields(user.uid),
        })
      }
      seeded.push(sectionId)
    }

    if (seeded.length > 0) {
      await batch.commit()
    }

    await recordAuditEvent({
      eventType: 'WelcomeContentSeeded',
      category: 'HR',
      module: 'hr',
      resourceType: 'welcomeContent',
      resourceId: 'seed',
      action: 'seed',
      user,
      metadata: { seeded, skipped },
    })

    return successResponse(
      { seeded, skipped },
      seeded.length > 0
        ? `Seeded ${seeded.length} section draft(s), skipped ${skipped.length} that already had content. Review each one, then publish.`
        : 'Every section already has content — nothing was overwritten.',
    )
  } catch (error) {
    return handleError(error)
  }
})
