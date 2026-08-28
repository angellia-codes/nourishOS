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
  resolveEmployeeUid,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'

/**
 * §2.7 — two acknowledgement paths, both landing on the same doc shape.
 * Levels I-III (soloScorer) can acknowledge their own review directly if the
 * caller's own uid resolves to the subject employee (via resolveEmployeeUid,
 * the same "employee has a NourishOS login" lookup Employee Communication
 * already established) — no extra permission needed, it's an identity check
 * on the caller's own record, not a role grant. Everyone else needs
 * `appraisals.acknowledge` (subject's DH or HR Manager) plus a captured
 * signature, and the record shows a DEVICE OPERATOR, not a verified subject
 * identity — the spec says so plainly (§2.7).
 *
 * Known, named launch-time consequence (§B5 of the build plan): nothing in
 * this codebase populates `users/{uid}.employeeId` yet (confirmed — same gap
 * Employee Communication already tolerates), so the authenticated path never
 * actually fires today. Every acknowledgement is on-device until account
 * linking exists as its own follow-up.
 */
export const acknowledgeAppraisal = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { appraisalId, signatureFileId, witnessedByUid } = (request.data ?? {}) as {
      appraisalId?: string
      signatureFileId?: string
      witnessedByUid?: string
    }
    if (!appraisalId) {
      throw new AppError('invalid-argument', 'appraisalId is required.')
    }

    const ref = db.collection(COLLECTIONS.APPRAISALS).doc(appraisalId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Appraisal not found.')
    }
    const appraisal = snap.data()!

    if (appraisal.status !== 'approved') {
      throw new AppError('failed-precondition', 'This appraisal is not yet ready for acknowledgement.')
    }
    if (appraisal.acknowledgement) {
      throw new AppError('failed-precondition', 'This appraisal has already been acknowledged.')
    }

    const subjectUid = await resolveEmployeeUid(appraisal.employeeId as string)
    const isSelfAcknowledging = subjectUid === user.uid && appraisal.scorerModel === 'soloScorer'

    let acknowledgement: Record<string, unknown>
    if (isSelfAcknowledging) {
      acknowledgement = {
        acknowledgedAt: FieldValue.serverTimestamp(),
        signatureFileId: null,
        deviceOperatorUid: null,
        witnessedByUid: null,
        method: 'authenticated',
      }
    } else {
      requirePermission(user, PERMISSIONS.APPRAISALS_ACKNOWLEDGE)
      if (!signatureFileId) {
        throw new AppError('invalid-argument', 'A captured signature is required for an on-device acknowledgement.')
      }
      acknowledgement = {
        acknowledgedAt: FieldValue.serverTimestamp(),
        signatureFileId,
        deviceOperatorUid: user.uid,
        witnessedByUid: witnessedByUid ?? null,
        method: 'onDeviceSignature',
      }
    }

    await ref.update({ acknowledgement, status: 'completed', ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'AppraisalAcknowledged',
      category: 'HR',
      module: 'hr',
      resourceType: 'appraisal',
      resourceId: appraisalId,
      action: 'update',
      user,
      metadata: { method: acknowledgement.method },
    })

    return successResponse(undefined, 'Appraisal acknowledged.')
  } catch (error) {
    handleError(error)
  }
})
