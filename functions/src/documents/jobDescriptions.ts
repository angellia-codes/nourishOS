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
 * Job Descriptions register — documents.md §5 (document types) / §20 (collection
 * conventions).
 *
 * Two deliberate deviations from that doc, both because this is a hand-curated
 * reference list rather than a versioned, approval-routed document:
 *
 * 1. documents.md §4's module tree has no Job Descriptions section at all, and
 *    §20 lists no such collection — this is a new, module-specific collection
 *    rather than a `documents` doc with a `type` discriminator, so the access
 *    rule below can gate it without gating every other document type too.
 * 2. The PDF is an external URL on the doc, not a `files` record queried by
 *    resourceType/resourceId (the FILE_STORAGE.md §15 convention followed by
 *    Employee/Appraisal/PatrolLog). The files live in the company's existing
 *    Drive; nothing is uploaded to Storage here, so there is no file metadata
 *    to write and no orphaned-blob path to clean up.
 *
 * Who may *read* the register is runtime-editable: `setJobDescriptionAccess`
 * writes an allowlist of role ids to systemSettings/jobDescriptionAccess, which
 * firestore.rules reads with a get(). Who may *write* it is super admin only.
 */

/** Singleton doc id inside systemSettings — matches the `*NumberSequences` singleton convention. */
const ACCESS_DOC_ID = 'jobDescriptionAccess'

/**
 * Every role id the app knows about. ROLE_PERMISSIONS covers all 17 assignable
 * roles; superAdmin is added back because it is omitted there on purpose and a
 * client that echoes it in the allowlist should not be an error.
 */
const VALID_ROLE_IDS = ['superAdmin', ...Object.keys(ROLE_PERMISSIONS)]

/** A type alias, not an interface: only aliases get the implicit index signature recordAuditEvent's Record<string, unknown> fields need. */
type JobDescriptionFields = {
  departmentId: string
  roleId: string
  title: string
  pdfUrl: string
  notes: string | null
}

/**
 * Validates and normalises the client payload. The department/role pair is
 * checked against the same org chart registerUser uses, so a client can't post
 * a role that doesn't exist in the department it claims.
 */
function validateFields(input: Partial<JobDescriptionFields>): JobDescriptionFields {
  const departmentId = input.departmentId?.trim() ?? ''
  const roles = DEPARTMENT_ROLES[departmentId]
  if (!roles) {
    throw new AppError('invalid-argument', 'Select a valid department.')
  }

  const roleId = input.roleId?.trim() ?? ''
  if (!roles.includes(roleId)) {
    throw new AppError('invalid-argument', 'Select a role that exists in this department.')
  }

  const title = input.title?.trim() ?? ''
  if (!title) {
    throw new AppError('invalid-argument', 'A title is required.')
  }
  if (title.length > 160) {
    throw new AppError('invalid-argument', 'Title must be 160 characters or fewer.')
  }

  // The link is rendered straight into an <a href>, so a javascript: or data:
  // value would be stored XSS. Parse it rather than pattern-match it, and store
  // the parsed form so the scheme can't be smuggled past by whitespace or case.
  let parsed: URL
  try {
    parsed = new URL(input.pdfUrl?.trim() ?? '')
  } catch {
    throw new AppError('invalid-argument', 'Enter a valid link, including https://.')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError('invalid-argument', 'The link must start with http:// or https://.')
  }

  const notes = input.notes?.trim() ?? ''
  if (notes.length > 500) {
    throw new AppError('invalid-argument', 'Notes must be 500 characters or fewer.')
  }

  return { departmentId, roleId, title, pdfUrl: parsed.toString(), notes: notes || null }
}

export const createJobDescription = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'add a job description')

    const fields = validateFields((request.data ?? {}) as Partial<JobDescriptionFields>)

    const ref = db.collection(COLLECTIONS.JOB_DESCRIPTIONS).doc()
    await ref.set({ ...fields, ...newDocumentBaseFields(user.uid) })

    await recordAuditEvent({
      eventType: 'JobDescriptionCreated',
      category: 'Documents',
      module: 'documents',
      resourceType: 'jobDescription',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: fields,
    })

    return successResponse({ jobDescriptionId: ref.id }, 'Job description added.')
  } catch (error) {
    return handleError(error)
  }
})

export const updateJobDescription = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'edit a job description')

    const data = (request.data ?? {}) as Partial<JobDescriptionFields> & { jobDescriptionId?: string }
    const jobDescriptionId = data.jobDescriptionId?.trim() ?? ''
    if (!jobDescriptionId) {
      throw new AppError('invalid-argument', 'jobDescriptionId is required.')
    }

    const fields = validateFields(data)

    const ref = db.collection(COLLECTIONS.JOB_DESCRIPTIONS).doc(jobDescriptionId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.isArchived === true) {
      throw new AppError('not-found', 'That job description no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'JobDescriptionUpdated',
      category: 'Documents',
      module: 'documents',
      resourceType: 'jobDescription',
      resourceId: jobDescriptionId,
      action: 'update',
      user,
      previousValues: {
        departmentId: previous.departmentId,
        roleId: previous.roleId,
        title: previous.title,
        pdfUrl: previous.pdfUrl,
        notes: previous.notes ?? null,
      },
      newValues: fields,
    })

    return successResponse({ jobDescriptionId }, 'Job description updated.')
  } catch (error) {
    return handleError(error)
  }
})

/** Soft delete only — same convention as archiveEmployee. Nothing in this repo hard-deletes a business document. */
export const deleteJobDescription = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'delete a job description')

    const { jobDescriptionId } = (request.data ?? {}) as { jobDescriptionId?: string }
    if (!jobDescriptionId) {
      throw new AppError('invalid-argument', 'jobDescriptionId is required.')
    }

    const ref = db.collection(COLLECTIONS.JOB_DESCRIPTIONS).doc(jobDescriptionId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That job description no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ status: 'archived', isArchived: true, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'JobDescriptionDeleted',
      category: 'Documents',
      module: 'documents',
      resourceType: 'jobDescription',
      resourceId: jobDescriptionId,
      action: 'delete',
      user,
      previousValues: { departmentId: previous.departmentId, roleId: previous.roleId, title: previous.title },
    })

    return successResponse({ jobDescriptionId }, 'Job description deleted.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * Sets which roles may read the register. The written doc is exactly what
 * firestore.rules reads, so this is a real access change, not a UI hint —
 * hence severity 'high' on the audit entry.
 *
 * Until this runs for the first time the doc does not exist, the rules get()
 * yields null and only isElevated() roles can read. That closed-by-default
 * state is intentional.
 */
export const setJobDescriptionAccess = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'change who can access job descriptions')

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
      eventType: 'JobDescriptionAccessChanged',
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
