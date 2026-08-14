import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requireSuperAdmin,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { DEPARTMENT_ROLES, ROLE_PERMISSIONS } from '../lib/organization'

/**
 * SOP Library — documents.md §6 ("Maintain all approved operational procedures",
 * browsable by department).
 *
 * Same shape as the Job Descriptions register next door, and the same two
 * deviations from documents.md, for the same reasons:
 *
 * 1. The Drive link is an external URL on the doc, not a `files` record queried
 *    by resourceType/resourceId (FILE_STORAGE.md §15). The SOPs already live in
 *    the company's Drive; nothing is uploaded to Storage here.
 * 2. §6's feature list (version history, approval workflow, tags, categories,
 *    search, PDF preview) is aspirational — this ships the browse-by-department
 *    register only. The rest belongs to the versioned `documents` collection if
 *    and when that is built.
 *
 * Departments come from the org chart in ../lib/organization (14 entries), not
 * §6's 10-department list — the org chart is what registerUser and every other
 * department dropdown already speak.
 *
 * Who may *read* the library is runtime-editable: `setSopAccess` writes an
 * allowlist of role ids to systemSettings/sopAccess, which firestore.rules reads
 * with a get(). Who may *write* it is super admin only.
 */

/** Singleton doc id inside systemSettings — matches the `*NumberSequences` singleton convention. */
const ACCESS_DOC_ID = 'sopAccess'

/** Every role id the app knows about; superAdmin is added back because ROLE_PERMISSIONS omits it on purpose. */
const VALID_ROLE_IDS = ['superAdmin', ...Object.keys(ROLE_PERMISSIONS)]

/** A type alias, not an interface: only aliases get the implicit index signature recordAuditEvent's Record<string, unknown> fields need. */
type SopFields = {
  departmentId: string
  sopNumber: string
  topic: string
  driveUrl: string
}

/** Validates and normalises the client payload against the same org chart registerUser uses. */
function validateFields(input: Partial<SopFields>): SopFields {
  const departmentId = input.departmentId?.trim() ?? ''
  if (!DEPARTMENT_ROLES[departmentId]) {
    throw new AppError('invalid-argument', 'Select a valid department.')
  }

  const sopNumber = input.sopNumber?.trim() ?? ''
  if (!sopNumber) {
    throw new AppError('invalid-argument', 'An SOP number is required.')
  }
  if (sopNumber.length > 40) {
    throw new AppError('invalid-argument', 'SOP number must be 40 characters or fewer.')
  }

  const topic = input.topic?.trim() ?? ''
  if (!topic) {
    throw new AppError('invalid-argument', 'An SOP topic is required.')
  }
  if (topic.length > 160) {
    throw new AppError('invalid-argument', 'SOP topic must be 160 characters or fewer.')
  }

  // The link is rendered straight into an <a href>, so a javascript: or data:
  // value would be stored XSS. Parse it rather than pattern-match it, and store
  // the parsed form so the scheme can't be smuggled past by whitespace or case.
  let parsed: URL
  try {
    parsed = new URL(input.driveUrl?.trim() ?? '')
  } catch {
    throw new AppError('invalid-argument', 'Enter a valid link, including https://.')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError('invalid-argument', 'The link must start with http:// or https://.')
  }

  // No duplicate-sopNumber check: the library is curated by one super admin, so
  // a scan query on every write buys nothing.
  // ponytail: no uniqueness guard, add a departmentId+sopNumber query if more than one person curates.
  return { departmentId, sopNumber, topic, driveUrl: parsed.toString() }
}

export const createSop = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'add an SOP')

    const fields = validateFields((request.data ?? {}) as Partial<SopFields>)

    const ref = db.collection(COLLECTIONS.SOPS).doc()
    await ref.set({ ...fields, ...newDocumentBaseFields(user.uid) })

    await recordAuditEvent({
      eventType: 'SopCreated',
      category: 'Documents',
      module: 'documents',
      resourceType: 'sop',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: fields,
    })

    return successResponse({ sopId: ref.id }, 'SOP added.')
  } catch (error) {
    return handleError(error)
  }
})

export const updateSop = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'edit an SOP')

    const data = (request.data ?? {}) as Partial<SopFields> & { sopId?: string }
    const sopId = data.sopId?.trim() ?? ''
    if (!sopId) {
      throw new AppError('invalid-argument', 'sopId is required.')
    }

    const fields = validateFields(data)

    const ref = db.collection(COLLECTIONS.SOPS).doc(sopId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.isArchived === true) {
      throw new AppError('not-found', 'That SOP no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'SopUpdated',
      category: 'Documents',
      module: 'documents',
      resourceType: 'sop',
      resourceId: sopId,
      action: 'update',
      user,
      previousValues: {
        departmentId: previous.departmentId,
        sopNumber: previous.sopNumber,
        topic: previous.topic,
        driveUrl: previous.driveUrl,
      },
      newValues: fields,
    })

    return successResponse({ sopId }, 'SOP updated.')
  } catch (error) {
    return handleError(error)
  }
})

/** Soft delete only — same convention as deleteJobDescription/archiveEmployee. */
export const deleteSop = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'delete an SOP')

    const { sopId } = (request.data ?? {}) as { sopId?: string }
    if (!sopId) {
      throw new AppError('invalid-argument', 'sopId is required.')
    }

    const ref = db.collection(COLLECTIONS.SOPS).doc(sopId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That SOP no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ status: 'archived', isArchived: true, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'SopDeleted',
      category: 'Documents',
      module: 'documents',
      resourceType: 'sop',
      resourceId: sopId,
      action: 'delete',
      user,
      previousValues: {
        departmentId: previous.departmentId,
        sopNumber: previous.sopNumber,
        topic: previous.topic,
      },
    })

    return successResponse({ sopId }, 'SOP deleted.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Sets which roles may read the library. The written doc is exactly what
 * firestore.rules reads, so this is a real access change, not a UI hint — hence
 * severity 'high' on the audit entry.
 *
 * Until this runs for the first time the doc does not exist, the rules get()
 * yields null and only isElevated() roles can read. That closed-by-default state
 * is intentional.
 */
export const setSopAccess = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'change who can access the SOP library')

    const { roleIds } = (request.data ?? {}) as { roleIds?: unknown }
    if (!Array.isArray(roleIds) || roleIds.some((roleId) => typeof roleId !== 'string')) {
      throw new AppError('invalid-argument', 'roleIds must be an array of role ids.')
    }

    const unique = [...new Set(roleIds as string[])]
    const unknown = unique.filter((roleId) => !VALID_ROLE_IDS.includes(roleId))
    if (unknown.length > 0) {
      throw new AppError('invalid-argument', `Unknown role(s): ${unknown.join(', ')}.`)
    }

    const ref = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(ACCESS_DOC_ID)
    const snap = await ref.get()
    const previous = (snap.data()?.roleIds as string[] | undefined) ?? []

    await ref.set(
      snap.exists
        ? { roleIds: unique, ...updatedFields(user.uid) }
        : { roleIds: unique, ...newDocumentBaseFields(user.uid) },
      { merge: true },
    )

    await recordAuditEvent({
      eventType: 'SopAccessChanged',
      category: 'Documents',
      module: 'documents',
      resourceType: 'systemSetting',
      resourceId: ACCESS_DOC_ID,
      action: 'update',
      user,
      severity: 'high',
      previousValues: { roleIds: previous },
      newValues: { roleIds: unique },
    })

    return successResponse({ roleIds: unique }, 'Module access updated.')
  } catch (error) {
    return handleError(error)
  }
})
