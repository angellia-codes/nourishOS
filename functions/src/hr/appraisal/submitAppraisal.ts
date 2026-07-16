import { onCall } from 'firebase-functions/v2/https'
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

interface SubjectScoreInput {
  subjectId: string
  score: 1 | 2 | 3 | 4 | 5
  reviewerNote?: string
}

export const submitAppraisal = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_SUBMIT)

    const { appraisalId, subjectScores, overallComment } = (request.data ?? {}) as {
      appraisalId?: string
      subjectScores?: SubjectScoreInput[]
      overallComment?: string
    }

    if (!appraisalId || !Array.isArray(subjectScores)) {
      throw new AppError('invalid-argument', 'appraisalId and subjectScores are required.')
    }

    const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId)
    const appraisalSnap = await appraisalRef.get()
    if (!appraisalSnap.exists) {
      throw new AppError('not-found', 'Appraisal not found.')
    }
    const appraisal = appraisalSnap.data()!

    if (appraisal.reviewerId !== user.uid) {
      throw new AppError('permission-denied', 'Only the assigned reviewer can submit this appraisal.')
    }
    if (appraisal.status !== 'draft') {
      throw new AppError('failed-precondition', `This appraisal is already ${appraisal.status}.`)
    }

    const templateSnap = await db.collection(COLLECTIONS.APPRAISAL_TEMPLATES).doc(appraisal.templateId).get()
    if (!templateSnap.exists) {
      throw new AppError('failed-precondition', 'The template this appraisal was created from no longer exists.')
    }
    const templateSubjects = templateSnap.data()!.subjects as { subjectId: string; label: string }[]

    // Completeness check — every template subject must have exactly one valid score.
    const providedIds = new Set(subjectScores.map((s) => s.subjectId))
    const missing = templateSubjects.filter((subject) => !providedIds.has(subject.subjectId))
    if (missing.length > 0) {
      throw new AppError('invalid-argument', `Missing scores for: ${missing.map((s) => s.label).join(', ')}.`)
    }
    for (const s of subjectScores) {
      if (!Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
        throw new AppError('invalid-argument', `Score for "${s.subjectId}" must be an integer from 1 to 5.`)
      }
    }

    const overallScore = subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length

    // Every review type routes through HR Manager, then GM — confirmed decision,
    // sequential (not parallel), not conditional on reviewType. The route
    // itself is server-owned (shared/approval/routes.ts, 'hr/appraisal');
    // notification to the first-step approver is handled inside
    // submitApprovalInternal — see shared/approval/notifyApprovers.ts.
    const approvalRequestId = await submitApprovalInternal({
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      requestedBy: user.uid,
    })

    await appraisalRef.update({
      subjectScores,
      overallScore,
      overallComment: overallComment?.trim() || null,
      status: 'pending',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'AppraisalSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      action: 'submit',
      user,
      newValues: { overallScore, approvalRequestId },
    })

    return successResponse(undefined, 'Submitted for HR Manager and GM approval.')
  } catch (error) {
    handleError(error)
  }
})
