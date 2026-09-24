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
import { submitApprovalInternal } from '../../shared/approval'

/**
 * §6.2 — the mandatory HR gate. Revised 2026-09-24: HR's approval of a new
 * draft no longer makes it live — it moves to `pendingGm` and raises an
 * 'hr/appraisalTemplate' approval for the GM; the resolved handler in
 * index.ts is what flips it to `approved`. A `stale` template (already live,
 * flagged only because its JD changed) is re-affirmed by HR alone, since its
 * criteria have not changed.
 *
 * Original note: `createAppraisal` rejects any template not
 * `approved`, so this is what actually turns a generated draft into a live
 * scoring instrument. Audits the full criteria snapshot so a disputed
 * appraisal traces to exactly which instrument was approved, by whom, when.
 */
export const approveAppraisalTemplate = onCall({ region: REGION }, async (request) => {
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
    if (template.templateStatus !== 'draft' && template.templateStatus !== 'stale') {
      throw new AppError('failed-precondition', `This template is already ${template.templateStatus as string}.`)
    }
    if (!Array.isArray(template.criteria) || template.criteria.length === 0) {
      throw new AppError('failed-precondition', 'This template has no criteria.')
    }

    if (template.templateStatus === 'stale') {
      await ref.update({
        templateStatus: 'approved',
        approvedByUid: user.uid,
        approvedAt: FieldValue.serverTimestamp(),
        ...updatedFields(user.uid),
      })
    } else {
      const approvalRequestId = await submitApprovalInternal({
        module: 'hr',
        resourceType: 'appraisalTemplate',
        resourceId: templateId,
        requestedBy: user.uid,
      })
      await ref.update({
        templateStatus: 'pendingGm',
        approvedByUid: user.uid,
        approvedAt: FieldValue.serverTimestamp(),
        approvalRequestId,
        ...updatedFields(user.uid),
      })
    }

    await recordAuditEvent({
      eventType: 'AppraisalTemplateApproved',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisalTemplate',
      resourceId: templateId,
      action: 'approve',
      user,
      newValues: { criteria: template.criteria, stage: template.templateStatus === 'stale' ? 'reaffirmed' : 'hr' },
    })

    return successResponse(
      undefined,
      template.templateStatus === 'stale'
        ? 'Template re-approved. It stays live for new appraisals.'
        : 'Approved by HR — sent to the GM for sign-off.',
    )
  } catch (error) {
    handleError(error)
  }
})
