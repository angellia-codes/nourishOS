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
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

/**
 * welcome-portal.md §2 D4 / §7.4 — the hybrid content model.
 *
 * Company Profile, Core Values and Grooming Standard are static in the welcome
 * bundle: they change when the company changes, which is a deploy either way.
 * The four below change without one, so they live in Firestore and HR edits
 * them at /documents/welcome.
 *
 * Draft and published are two fields on one document rather than two
 * documents: a section is never partly published, and a single doc read is
 * what the portal callable needs anyway.
 */

export const WELCOME_SECTIONS = ['menu', 'orgChart', 'attendanceGuide', 'dosAndDonts'] as const
export type WelcomeSection = (typeof WELCOME_SECTIONS)[number]

/** Generous, but bounded — this is an authenticated write, not a public one. */
const MAX_SECTION_BYTES = 256 * 1024

function requireSection(value: unknown): WelcomeSection {
  const section = typeof value === 'string' ? value.trim() : ''
  if (!WELCOME_SECTIONS.includes(section as WelcomeSection)) {
    throw new AppError('invalid-argument', `sectionId must be one of: ${WELCOME_SECTIONS.join(', ')}.`)
  }
  return section as WelcomeSection
}

/**
 * The body is a free-form structured payload — a menu is categories and items,
 * an org chart is one file id, the guides are blocks of prose — so it is
 * stored as given rather than schema-checked field by field. What is enforced
 * is that it is an object and that it cannot be used as a storage bucket.
 */
function requireBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('invalid-argument', 'content must be an object.')
  }
  const size = Buffer.byteLength(JSON.stringify(value), 'utf8')
  if (size > MAX_SECTION_BYTES) {
    throw new AppError('invalid-argument', 'That section is too large. Split it or shorten it.')
  }
  return value as Record<string, unknown>
}

export const updateWelcomeContent = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.WELCOME_MANAGE_CONTENT)

    const data = (request.data ?? {}) as Record<string, unknown>
    const sectionId = requireSection(data.sectionId)
    const content = requireBody(data.content)

    const ref = db.collection(COLLECTIONS.WELCOME_CONTENT).doc(sectionId)
    const snap = await ref.get()

    if (snap.exists) {
      await ref.update({ draft: content, ...updatedFields(user.uid) })
    } else {
      await ref.set({
        sectionId,
        draft: content,
        published: null,
        publishedAt: null,
        publishedBy: null,
        ...newDocumentBaseFields(user.uid),
      })
    }

    await recordAuditEvent({
      eventType: 'WelcomeContentUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'welcomeContent',
      resourceId: sectionId,
      action: 'update',
      user,
      newValues: { sectionId },
    })

    return successResponse({ sectionId }, 'Draft saved.')
  } catch (error) {
    return handleError(error)
  }
})

export const publishWelcomeContent = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.WELCOME_MANAGE_CONTENT)

    const data = (request.data ?? {}) as Record<string, unknown>
    const sectionId = requireSection(data.sectionId)

    const ref = db.collection(COLLECTIONS.WELCOME_CONTENT).doc(sectionId)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()?.draft) {
      throw new AppError('failed-precondition', 'There is nothing to publish — save a draft first.')
    }

    const publishedAt = new Date().toISOString()
    await ref.update({
      published: snap.data()!.draft,
      publishedAt,
      publishedBy: user.uid,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'WelcomeContentPublished',
      category: 'HR',
      module: 'hr',
      resourceType: 'welcomeContent',
      resourceId: sectionId,
      action: 'update',
      user,
      newValues: { sectionId, publishedAt },
    })

    return successResponse({ sectionId, publishedAt }, 'Published. New hires see it immediately.')
  } catch (error) {
    return handleError(error)
  }
})
