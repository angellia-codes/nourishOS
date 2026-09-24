import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

const RESTORABLE_STATUSES = new Set(['draft', 'approved', 'stale'])

/**
 * Soft delete (2026-09-24) — HR Manager / superAdmin, on the same
 * appraisalTemplates.approve permission that governs making a template live.
 * The previous status is kept in `archivedFromStatus` so a restore puts it
 * back exactly. In-flight appraisals are pinned to their own templateId and
 * keep working; createAppraisal only accepts approved/stale templates, so an
 * archived one simply stops being used for new appraisals.
 *
 * Blocked while `pendingGm`: the GM's approval request would otherwise be
 * left pointing at a template nobody can see.
 */
export const archiveAppraisalTemplate = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE)

    const { templateId } = (request.data ?? {}) as { templateId?: string }
    if (!templateId) {
      throw new AppError('invalid-argument', 'templateId is required.')
    }

    const ref = db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(templateId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Template not found.')
    }
    const status = snap.data()!.templateStatus as string
    if (status === 'archived') {
      throw new AppError('failed-precondition', 'This template is already archived.')
    }
    if (status === 'pendingGm') {
      throw new AppError('failed-precondition', 'This template is waiting for the GM. Archive it after the GM decides.')
    }

    await ref.update({
      templateStatus: 'archived',
      archivedFromStatus: status,
      archivedAt: FieldValue.serverTimestamp(),
      archivedBy: user.uid,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AppraisalTemplateArchived',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisalTemplate',
      resourceId: templateId,
      action: 'archive',
      user,
      metadata: { archivedFromStatus: status },
    })

    return successResponse(undefined, 'Template archived.')
  } catch (error) {
    handleError(error)
  }
})

/** Undo of archiveAppraisalTemplate — back to the status it was archived from. */
export const restoreAppraisalTemplate = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE)

    const { templateId } = (request.data ?? {}) as { templateId?: string }
    if (!templateId) {
      throw new AppError('invalid-argument', 'templateId is required.')
    }

    const ref = db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(templateId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Template not found.')
    }
    const template = snap.data()!
    if (template.templateStatus !== 'archived') {
      throw new AppError('failed-precondition', 'Only an archived template can be restored.')
    }

    const positionSnap = await db.collection(COLLECTIONS.POSITIONS).doc(template.positionId as string).get()
    if (positionSnap.exists && positionSnap.data()!.isActive === false) {
      throw new AppError('failed-precondition', 'This position is archived. Restore the position first.')
    }

    const previous = template.archivedFromStatus as string | undefined
    const restoredStatus = previous && RESTORABLE_STATUSES.has(previous) ? previous : 'draft'

    await ref.update({
      templateStatus: restoredStatus,
      archivedFromStatus: FieldValue.delete(),
      archivedAt: FieldValue.delete(),
      archivedBy: FieldValue.delete(),
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AppraisalTemplateRestored',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisalTemplate',
      resourceId: templateId,
      action: 'restore',
      user,
      metadata: { restoredStatus },
    })

    return successResponse({ templateStatus: restoredStatus }, `Template restored (${restoredStatus}).`)
  } catch (error) {
    handleError(error)
  }
})
