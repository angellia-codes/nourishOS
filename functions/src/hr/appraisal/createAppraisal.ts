import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'

export interface CreateAppraisalInput {
  employeeId: string
  positionId: string
  reviewType: 'probation' | 'quarterly' | 'annual'
  periodLabel: string
  /**
   * Defaults to the acting user's own uid (the manual "HR creates and
   * reviews" flow). The probation auto-trigger has no human caller, so it
   * passes the resolved department-leader/hrManager uid explicitly instead.
   */
  reviewerId?: string
}

/**
 * The mutation itself, split out from the callable so the 100-day probation
 * scheduled trigger (probationReviewTrigger.ts) can call it once per employee
 * without a human caller — same extraction createEmployeeInternal set for the
 * employee module. No permission check here; the caller is trusted.
 */
export async function createAppraisalInternal(
  user: AuthedUser,
  input: Partial<CreateAppraisalInput>,
): Promise<{ appraisalId: string }> {
  const { employeeId, positionId, reviewType, periodLabel, reviewerId } = input

  if (!employeeId || !positionId || !reviewType || !periodLabel) {
    throw new AppError('invalid-argument', 'employeeId, positionId, reviewType, and periodLabel are required.')
  }

  const templateSnap = await db
    .collection(COLLECTIONS.APPRAISAL_TEMPLATES)
    .where('positionId', '==', positionId)
    .where('reviewType', '==', reviewType)
    .where('isArchived', '==', false)
    .orderBy('version', 'desc')
    .limit(1)
    .get()

  if (templateSnap.empty) {
    throw new AppError(
      'failed-precondition',
      `No appraisal template configured for position "${positionId}" / review type "${reviewType}". Seed one first.`,
    )
  }
  const template = templateSnap.docs[0]

  const appraisalRef = db.collection(COLLECTIONS.APPRAISALS).doc()
  await appraisalRef.set({
    employeeId,
    reviewerId: reviewerId ?? user.uid,
    positionId,
    reviewType,
    templateId: template.id,
    templateVersion: template.data().version,
    periodLabel,
    subjectScores: [],
    overallScore: 0,
    overallComment: null,
    approvalRequestId: null,
    aiInsights: null,
    ...newDocumentBaseFields(user.uid, 'draft'),
  })

  await recordAuditEvent({
    eventType: 'AppraisalCreated',
    category: 'HR',
    module: 'hr',
    resourceType: 'appraisal',
    resourceId: appraisalRef.id,
    action: 'create',
    user,
    newValues: { employeeId, positionId, reviewType, periodLabel },
  })

  return { appraisalId: appraisalRef.id }
}

export const createAppraisal = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_CREATE)

    const result = await createAppraisalInternal(user, (request.data ?? {}) as Partial<CreateAppraisalInput>)

    return successResponse(result, 'Appraisal draft created.')
  } catch (error) {
    handleError(error)
  }
})
