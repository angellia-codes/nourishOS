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
} from '../lib'

/**
 * Company Forms + Templates — FEATURE_SPECIFICATIONS.md Module 4. Both are
 * curated-by-hand "title + external link" registers, same shape as SOP
 * Library, so they share one collection-picking implementation instead of
 * duplicating SOP Library's four-callable shape twice. The spec's "Approval
 * Workflow" sub-feature for Company Forms would mean a generic dynamic
 * form-submission engine — out of scope, a deliberate deviation noted here,
 * same kind of scope-down SOP Library already made against its own spec.
 *
 * Gated by documents.publish, an existing permission string that had no
 * caller until now (already granted to hrManager/marketing). No access-list
 * doc like JD/SOP — every signed-in user can read, same as everything else
 * in the app defaults to unless a doc says otherwise.
 */

export type DocumentResourceKind = 'form' | 'template'

const COLLECTION_FOR_KIND: Record<DocumentResourceKind, string> = {
  form: COLLECTIONS.COMPANY_FORMS,
  template: COLLECTIONS.TEMPLATES,
}

type ResourceFields = {
  title: string
  category: string
  driveUrl: string
}

function validateFields(input: Partial<ResourceFields>): ResourceFields {
  const title = input.title?.trim() ?? ''
  if (!title) {
    throw new AppError('invalid-argument', 'A title is required.')
  }
  if (title.length > 160) {
    throw new AppError('invalid-argument', 'Title must be 160 characters or fewer.')
  }

  const category = input.category?.trim() ?? ''

  let parsed: URL
  try {
    parsed = new URL(input.driveUrl?.trim() ?? '')
  } catch {
    throw new AppError('invalid-argument', 'Enter a valid link, including https://.')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError('invalid-argument', 'The link must start with http:// or https://.')
  }

  return { title, category, driveUrl: parsed.toString() }
}

function requireKind(kind: unknown): DocumentResourceKind {
  if (kind !== 'form' && kind !== 'template') {
    throw new AppError('invalid-argument', 'resourceKind must be "form" or "template".')
  }
  return kind
}

export const createDocumentResource = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DOCUMENTS_PUBLISH)

    const data = (request.data ?? {}) as Partial<ResourceFields> & { resourceKind?: unknown }
    const resourceKind = requireKind(data.resourceKind)
    const fields = validateFields(data)

    const ref = db.collection(COLLECTION_FOR_KIND[resourceKind]).doc()
    await ref.set({ ...fields, ...newDocumentBaseFields(user.uid) })

    await recordAuditEvent({
      eventType: 'DocumentResourceCreated',
      category: 'Documents',
      module: 'documents',
      resourceType: resourceKind,
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: fields,
    })

    return successResponse({ resourceId: ref.id }, resourceKind === 'form' ? 'Form added.' : 'Template added.')
  } catch (error) {
    return handleError(error)
  }
})

export const updateDocumentResource = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DOCUMENTS_PUBLISH)

    const data = (request.data ?? {}) as Partial<ResourceFields> & { resourceKind?: unknown; resourceId?: string }
    const resourceKind = requireKind(data.resourceKind)
    const resourceId = data.resourceId?.trim() ?? ''
    if (!resourceId) {
      throw new AppError('invalid-argument', 'resourceId is required.')
    }
    const fields = validateFields(data)

    const ref = db.collection(COLLECTION_FOR_KIND[resourceKind]).doc(resourceId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.isArchived === true) {
      throw new AppError('not-found', 'That item no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ ...fields, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'DocumentResourceUpdated',
      category: 'Documents',
      module: 'documents',
      resourceType: resourceKind,
      resourceId,
      action: 'update',
      user,
      previousValues: { title: previous.title, category: previous.category, driveUrl: previous.driveUrl },
      newValues: fields,
    })

    return successResponse({ resourceId }, 'Updated.')
  } catch (error) {
    return handleError(error)
  }
})

/** Soft delete only — same convention as deleteSop/deleteJobDescription. */
export const deleteDocumentResource = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.DOCUMENTS_PUBLISH)

    const { resourceKind: rawKind, resourceId } = (request.data ?? {}) as {
      resourceKind?: unknown
      resourceId?: string
    }
    const resourceKind = requireKind(rawKind)
    if (!resourceId) {
      throw new AppError('invalid-argument', 'resourceId is required.')
    }

    const ref = db.collection(COLLECTION_FOR_KIND[resourceKind]).doc(resourceId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That item no longer exists.')
    }
    const previous = snap.data()!

    await ref.update({ status: 'archived', isArchived: true, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'DocumentResourceDeleted',
      category: 'Documents',
      module: 'documents',
      resourceType: resourceKind,
      resourceId,
      action: 'delete',
      user,
      previousValues: { title: previous.title },
    })

    return successResponse({ resourceId }, 'Deleted.')
  } catch (error) {
    return handleError(error)
  }
})
