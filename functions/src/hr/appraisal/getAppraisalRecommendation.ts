import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  resolveEmployeeUid,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

/**
 * §2.6/§3 — the one narrow "clients read Firestore directly, except this
 * case" exception in this module, same precedent as getEmployeeAuditLog.ts.
 * `confidential/recommendation` is Rule-gated too (defense in depth), but
 * the self-exclusion (§2.6: "a user can never read the confidential
 * recommendation on their own appraisal, regardless of permission") is
 * enforced here as the primary control, since HR Manager and GM both hold
 * `appraisals.readRecommendation` and are themselves appraisal subjects.
 */
export const getAppraisalRecommendation = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.APPRAISALS_READ_RECOMMENDATION)

    const { appraisalId } = (request.data ?? {}) as { appraisalId?: string }
    if (!appraisalId) {
      throw new AppError('invalid-argument', 'appraisalId is required.')
    }

    const appraisalSnap = await db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId).get()
    if (!appraisalSnap.exists) {
      throw new AppError('not-found', 'Appraisal not found.')
    }
    const appraisal = appraisalSnap.data()!

    const subjectUid = await resolveEmployeeUid(appraisal.employeeId as string)
    if (subjectUid === user.uid) {
      throw new AppError('permission-denied', 'You cannot read the confidential recommendation on your own appraisal.')
    }

    const recommendationSnap = await db
      .collection(COLLECTIONS.APPRAISALS)
      .doc(appraisalId)
      .collection('confidential')
      .doc('recommendation')
      .get()

    return successResponse(recommendationSnap.exists ? recommendationSnap.data() : null, 'OK')
  } catch (error) {
    handleError(error)
  }
})
