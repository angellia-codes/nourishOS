import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../lib'
import { OUTLET_DEPARTMENTS, DEPARTMENT_ROLES, ROLE_PERMISSIONS } from '../lib/organization'
import { sendNotificationInternal } from '../shared/notifications'
import { recordActivityInternal } from '../shared/activity'

/**
 * Announcements — communications.md §5, with Broadcast (§13) folded in as the
 * `emergency` category rather than a second collection and callable.
 *
 * Deviations from §5, all deliberate:
 *
 * 1. The optional Review step is dropped — the workflow is Draft → Publish →
 *    Archive, gated by `announcements.publish` rather than by the approval
 *    engine. Scheduled publication is dropped with it (it would need the repo's
 *    first scheduled job for a feature nothing has asked for yet).
 * 2. The body is plain text, not rich text — no editor dependency, and nothing
 *    that has to be sanitised before it renders.
 * 3. Audience targeting is outlet + department + role. Individual-user
 *    targeting is out; a direct message is not an announcement.
 *
 * Audience is stored twice on purpose. `outletIds`/`departmentIds`/`roleIds`
 * are the author's intent (empty array = "everyone"), and `audienceUids` is
 * that intent resolved to concrete uids at publish time. firestore.rules can
 * only allow a list query whose constraints it can also express, and
 * "outletIds is empty OR contains mine" is not a query — so the rule and the
 * feed query both key off `audienceUids`. Archiving clears it, which drops the
 * announcement out of every feed without the query needing a status filter.
 */

const CATEGORIES = [
  'operations',
  'hr',
  'finance',
  'training',
  'maintenance',
  'events',
  'emergency',
  'general',
] as const

/** Mirrors NOTIFICATION_PRIORITY in src/constants/statuses.ts — the published announcement becomes a notification at this priority. */
const PRIORITIES = ['critical', 'high', 'medium', 'low', 'informational'] as const

const VALID_OUTLET_IDS = Object.keys(OUTLET_DEPARTMENTS)
const VALID_DEPARTMENT_IDS = Object.keys(DEPARTMENT_ROLES)
/** superAdmin is added back because ROLE_PERMISSIONS omits it on purpose. */
const VALID_ROLE_IDS = ['superAdmin', ...Object.keys(ROLE_PERMISSIONS)]

/** A type alias, not an interface: only aliases get the implicit index signature recordAuditEvent's Record<string, unknown> fields need. */
type AnnouncementFields = {
  title: string
  body: string
  category: (typeof CATEGORIES)[number]
  priority: (typeof PRIORITIES)[number]
  isPinned: boolean
  outletIds: string[]
  departmentIds: string[]
  roleIds: string[]
}

function validateIds(raw: unknown, valid: string[], label: string): string[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== 'string')) {
    throw new AppError('invalid-argument', `${label} must be an array of ids.`)
  }
  const unique = [...new Set(raw as string[])]
  const unknown = unique.filter((id) => !valid.includes(id))
  if (unknown.length > 0) {
    throw new AppError('invalid-argument', `Unknown ${label}: ${unknown.join(', ')}.`)
  }
  return unique
}

/** communications.md §20: title, content and target audience are all required — an empty audience array means "everyone", which is still a choice. */
function validateFields(input: Partial<AnnouncementFields>): AnnouncementFields {
  const title = input.title?.trim() ?? ''
  if (!title) {
    throw new AppError('invalid-argument', 'A title is required.')
  }
  if (title.length > 160) {
    throw new AppError('invalid-argument', 'Title must be 160 characters or fewer.')
  }

  const body = input.body?.trim() ?? ''
  if (!body) {
    throw new AppError('invalid-argument', 'Announcement content is required.')
  }
  if (body.length > 8000) {
    throw new AppError('invalid-argument', 'Content must be 8000 characters or fewer.')
  }

  const category = input.category as (typeof CATEGORIES)[number]
  if (!CATEGORIES.includes(category)) {
    throw new AppError('invalid-argument', `category must be one of: ${CATEGORIES.join(', ')}.`)
  }

  const priority = input.priority as (typeof PRIORITIES)[number]
  if (!PRIORITIES.includes(priority)) {
    throw new AppError('invalid-argument', `priority must be one of: ${PRIORITIES.join(', ')}.`)
  }

  return {
    title,
    body,
    category,
    priority,
    isPinned: input.isPinned === true,
    outletIds: validateIds(input.outletIds, VALID_OUTLET_IDS, 'outletIds'),
    departmentIds: validateIds(input.departmentIds, VALID_DEPARTMENT_IDS, 'departmentIds'),
    roleIds: validateIds(input.roleIds, VALID_ROLE_IDS, 'roleIds'),
  }
}

/** §13 Broadcast is the emergency category, so it carries the broadcast permission rather than a separate callable. */
function requireCategoryPermission(user: AuthedUser, category: string): void {
  if (category === 'emergency') {
    requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_BROADCAST)
  }
}

/**
 * Resolves the audience arrays to concrete recipient uids. An empty array on a
 * dimension means "no constraint on that dimension", so all three empty is
 * company-wide.
 *
 * Filtered in memory rather than with compound where clauses: `in` caps at 30
 * values, and three independent array dimensions can't be combined in one
 * Firestore query anyway.
 * ponytail: one users scan per publish. Fine at Nourish's headcount — add a
 * denormalised outlet/department index or a queue past ~1000 active users.
 */
async function resolveAudienceUids(fields: AnnouncementFields): Promise<string[]> {
  const snap = await db.collection(COLLECTIONS.USERS).where('status', '==', 'active').get()

  return snap.docs
    .filter((doc) => {
      const user = doc.data()
      return (
        (fields.outletIds.length === 0 || fields.outletIds.includes(user.outletId)) &&
        (fields.departmentIds.length === 0 || fields.departmentIds.includes(user.departmentId)) &&
        (fields.roleIds.length === 0 || fields.roleIds.includes(user.roleId))
      )
    })
    .map((doc) => doc.id)
}

/** Publishes in place: resolves the audience, stamps the publish fields, then notifies. Shared by createAnnouncement(publishNow) and publishAnnouncement. */
async function publishInternal(
  announcementId: string,
  fields: AnnouncementFields,
  user: AuthedUser,
): Promise<string[]> {
  const audienceUids = await resolveAudienceUids(fields)

  await db
    .collection(COLLECTIONS.ANNOUNCEMENTS)
    .doc(announcementId)
    .update({
      announcementStatus: 'published',
      audienceUids,
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: user.uid,
      ...updatedFields(user.uid),
    })

  // ponytail: unbatched per-recipient notification writes, same ceiling as the
  // scan above — batch them if the recipient list ever runs to thousands.
  await Promise.all(
    audienceUids
      .filter((recipientUid) => recipientUid !== user.uid)
      .map((recipientUid) =>
        sendNotificationInternal({
          type: 'announcement',
          title: fields.category === 'emergency' ? 'Broadcast Message' : 'New Announcement',
          message: fields.title,
          module: 'communications',
          priority: fields.priority,
          recipientUid,
          senderUid: user.uid,
          referenceModule: 'communications',
          referenceId: announcementId,
          actionUrl: `/communications/announcements/${announcementId}`,
        }),
      ),
  )

  await recordActivityInternal({
    eventType: 'AnnouncementPublished',
    module: 'communications',
    title: fields.category === 'emergency' ? `Broadcast: ${fields.title}` : `Announcement published: ${fields.title}`,
    resourceType: 'announcement',
    resourceId: announcementId,
    actorUid: user.uid,
    actionUrl: `/communications/announcements/${announcementId}`,
  })

  return audienceUids
}

export const createAnnouncement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_CREATE)

    const data = (request.data ?? {}) as Partial<AnnouncementFields> & { publishNow?: boolean }
    const fields = validateFields(data)
    requireCategoryPermission(user, fields.category)

    // Publishing straight from create is what makes a broadcast one call
    // instead of two screens — but it is still the publish permission.
    const publishNow = data.publishNow === true
    if (publishNow) {
      requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_PUBLISH)
    }

    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc()
    await ref.set({
      ...fields,
      announcementStatus: 'draft',
      audienceUids: [],
      publishedAt: null,
      publishedBy: null,
      ...newDocumentBaseFields(user.uid),
    })

    let recipientCount = 0
    if (publishNow) {
      recipientCount = (await publishInternal(ref.id, fields, user)).length
    }

    await recordAuditEvent({
      eventType: publishNow ? 'AnnouncementPublished' : 'AnnouncementCreated',
      category: 'Communications',
      module: 'communications',
      resourceType: 'announcement',
      resourceId: ref.id,
      action: publishNow ? 'publish' : 'create',
      user,
      severity: fields.category === 'emergency' ? 'high' : 'informational',
      newValues: fields,
      metadata: publishNow ? { recipientCount } : undefined,
    })

    return successResponse(
      { announcementId: ref.id, recipientCount },
      publishNow ? `Announcement published to ${recipientCount} people.` : 'Draft saved.',
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Editable in draft *and* published state — a correction to a live notice is
 * more useful than a second one, and `isPinned` rides along here rather than
 * needing its own callable. Editing a published announcement re-resolves the
 * audience so a widened target reaches the people it now names.
 */
export const updateAnnouncement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_CREATE)

    const data = (request.data ?? {}) as Partial<AnnouncementFields> & { announcementId?: string }
    const announcementId = data.announcementId?.trim() ?? ''
    if (!announcementId) {
      throw new AppError('invalid-argument', 'announcementId is required.')
    }

    const fields = validateFields(data)
    requireCategoryPermission(user, fields.category)

    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That announcement no longer exists.')
    }
    const previous = snap.data()!

    if (previous.announcementStatus === 'archived') {
      throw new AppError('failed-precondition', 'An archived announcement can no longer be edited.')
    }
    if (previous.createdBy !== user.uid) {
      requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_PUBLISH)
    }

    const wasPublished = previous.announcementStatus === 'published'
    await ref.update({
      ...fields,
      // Re-resolved below for a published announcement; a draft keeps its empty list.
      ...(wasPublished ? {} : { audienceUids: [] }),
      ...updatedFields(user.uid),
    })

    if (wasPublished) {
      await ref.update({ audienceUids: await resolveAudienceUids(fields) })
    }

    await recordAuditEvent({
      eventType: 'AnnouncementUpdated',
      category: 'Communications',
      module: 'communications',
      resourceType: 'announcement',
      resourceId: announcementId,
      action: 'update',
      user,
      previousValues: {
        title: previous.title,
        body: previous.body,
        category: previous.category,
        priority: previous.priority,
        isPinned: previous.isPinned,
        outletIds: previous.outletIds,
        departmentIds: previous.departmentIds,
        roleIds: previous.roleIds,
      },
      newValues: fields,
    })

    return successResponse({ announcementId }, 'Announcement updated.')
  } catch (error) {
    return handleError(error)
  }
})

export const publishAnnouncement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_PUBLISH)

    const { announcementId } = (request.data ?? {}) as { announcementId?: string }
    if (!announcementId) {
      throw new AppError('invalid-argument', 'announcementId is required.')
    }

    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That announcement no longer exists.')
    }
    const previous = snap.data()!

    if (previous.announcementStatus !== 'draft') {
      throw new AppError('failed-precondition', `This announcement is already ${previous.announcementStatus}.`)
    }

    // Re-validated from the stored document rather than trusted: it was written
    // by createAnnouncement, but the broadcast gate has to hold at publish time
    // too, not only at draft time.
    const fields = validateFields(previous as Partial<AnnouncementFields>)
    requireCategoryPermission(user, fields.category)

    const audienceUids = await publishInternal(announcementId, fields, user)

    await recordAuditEvent({
      eventType: 'AnnouncementPublished',
      category: 'Communications',
      module: 'communications',
      resourceType: 'announcement',
      resourceId: announcementId,
      action: 'publish',
      user,
      severity: fields.category === 'emergency' ? 'high' : 'informational',
      newValues: { title: fields.title, category: fields.category },
      metadata: { recipientCount: audienceUids.length },
    })

    return successResponse(
      { announcementId, recipientCount: audienceUids.length },
      `Announcement published to ${audienceUids.length} people.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

/** Terminal. Clearing audienceUids is what removes it from every feed — the rule and the query both read that field. */
export const archiveAnnouncement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ANNOUNCEMENTS_PUBLISH)

    const { announcementId } = (request.data ?? {}) as { announcementId?: string }
    if (!announcementId) {
      throw new AppError('invalid-argument', 'announcementId is required.')
    }

    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That announcement no longer exists.')
    }
    const previous = snap.data()!

    if (previous.announcementStatus === 'archived') {
      throw new AppError('failed-precondition', 'This announcement is already archived.')
    }

    await ref.update({
      announcementStatus: 'archived',
      isArchived: true,
      isPinned: false,
      audienceUids: [],
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AnnouncementArchived',
      category: 'Communications',
      module: 'communications',
      resourceType: 'announcement',
      resourceId: announcementId,
      action: 'archive',
      user,
      previousValues: { announcementStatus: previous.announcementStatus, title: previous.title },
    })

    return successResponse({ announcementId }, 'Announcement archived.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * §5 read tracking. The doc id is `${announcementId}_${uid}`, so calling this
 * twice is one document and needs no read-before-write. No audit event — a read
 * receipt is not an audit-worthy action and would flood auditLogs.
 */
export const recordAnnouncementRead = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { announcementId } = (request.data ?? {}) as { announcementId?: string }
    if (!announcementId) {
      throw new AppError('invalid-argument', 'announcementId is required.')
    }

    const announcementSnap = await db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId).get()
    if (!announcementSnap.exists) {
      throw new AppError('not-found', 'That announcement no longer exists.')
    }

    await db
      .collection(COLLECTIONS.ANNOUNCEMENT_READS)
      .doc(`${announcementId}_${user.uid}`)
      .set(
        {
          announcementId,
          uid: user.uid,
          readAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    return successResponse({ announcementId }, 'Marked as read.')
  } catch (error) {
    return handleError(error)
  }
})
