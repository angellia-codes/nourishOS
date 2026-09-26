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
 *
 * **One exception: `orgChart` auto-publishes.** Unlike the other three
 * sections, its seed is real content HR already supplied and approved (the
 * chart image itself), not unreviewed first-pass copy — there is nothing left
 * for HR to read before a new hire does. It still writes a matching `draft`
 * so the editor shows the same content as "saved", but a hire sees it
 * immediately rather than the empty-section notice.
 */
export const seedWelcomeContent = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.WELCOME_MANAGE_CONTENT)

    const seeded: WelcomeSection[] = []
    const published: WelcomeSection[] = []
    const skipped: WelcomeSection[] = []
    const batch = db.batch()
    const publishedAt = new Date().toISOString()

    for (const sectionId of WELCOME_SECTIONS) {
      const ref = db.collection(COLLECTIONS.WELCOME_CONTENT).doc(sectionId)
      const snap = await ref.get()
      const existing = snap.data()

      if (existing?.draft || existing?.published) {
        skipped.push(sectionId)
        continue
      }

      const content = WELCOME_CONTENT_SEEDS[sectionId]
      const autoPublish = sectionId === 'orgChart'
      const publishFields = autoPublish
        ? { published: content, publishedAt, publishedBy: user.uid }
        : { published: null, publishedAt: null, publishedBy: null }

      if (snap.exists) {
        // The document exists but holds neither a draft nor a published
        // version — an updateWelcomeContent that created it with an empty body.
        batch.update(ref, { draft: content, ...publishFields, ...updatedFields(user.uid) })
      } else {
        batch.set(ref, {
          sectionId,
          draft: content,
          ...publishFields,
          ...newDocumentBaseFields(user.uid),
        })
      }
      seeded.push(sectionId)
      if (autoPublish) published.push(sectionId)
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
      metadata: { seeded, published, skipped },
    })

    return successResponse(
      { seeded, published, skipped },
      seeded.length > 0
        ? `Seeded ${seeded.length} section draft(s)${published.length > 0 ? `, published ${published.join(', ')}` : ''}, skipped ${skipped.length} that already had content. Review the rest, then publish.`
        : 'Every section already has content — nothing was overwritten.',
    )
  } catch (error) {
    return handleError(error)
  }
})
