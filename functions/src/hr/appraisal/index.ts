import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, updatedFields, type AuthedUser } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { registerEventHandler } from '../../shared/events'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'
import { recordEmployeeActivity } from '../employees/helpers'
import { fireAppraisalConsequences } from './consequences'

export { generateAppraisalTemplate } from './generateAppraisalTemplate'
export { approveAppraisalTemplate } from './approveAppraisalTemplate'
export { createAppraisal } from './createAppraisal'
export { submitPrimaryScores } from './submitPrimaryScores'
export { submitSecondaryScores } from './submitSecondaryScores'
export { acknowledgeAppraisal } from './acknowledgeAppraisal'
export { reopenAppraisal } from './reopenAppraisal'
export { getAppraisalRecommendation } from './getAppraisalRecommendation'
export { generateAppraisalInsights } from './generateAppraisalInsights'
export { scheduleAppraisalCycles } from './scheduleAppraisalCycles'

const SYSTEM_USER: AuthedUser = {
  uid: 'system:approvalEngine',
  email: null,
  displayName: 'System (Approval Engine)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
  employeeId: null,
}

/**
 * §7 — resolution of 'hr/appraisalV2' (only reached for dualScorer, via
 * submitSecondaryScores). soloScorer never engages the Approval Engine at
 * all (§5), so its §9 consequence fires inline in submitPrimaryScores
 * instead of here — this handler is the dualScorer half of §9.
 */
registerApprovalResolvedHandler('appraisalV2', async (event) => {
  const ref = db.collection(COLLECTIONS.APPRAISALS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing appraisal ${event.resourceId}`)
    return
  }
  const appraisal = snap.data()!

  await ref.update({ status: event.newStatus, ...updatedFields('system:approvalEngine') })

  if (event.newStatus === 'approved') {
    const employeeSnap = await db.collection(COLLECTIONS.EMPLOYEES).doc(appraisal.employeeId as string).get()
    if (employeeSnap.exists) {
      const employee = employeeSnap.data()!
      await recordEmployeeActivity(
        { id: employeeSnap.id, departmentId: employee.departmentId as string, outletId: employee.outletId as string },
        'appraisalCompleted',
        `Performance review completed (${appraisal.periodLabel as string}).`,
        SYSTEM_USER,
      )
    }

    await fireAppraisalConsequences({
      appraisalId: event.resourceId,
      employeeId: appraisal.employeeId as string,
      finalScore: appraisal.finalScore as number,
      ratingBand: appraisal.ratingBand,
      scorerModel: 'dualScorer',
    })
  }

  await sendNotificationInternal({
    type: 'alert',
    title: event.newStatus === 'approved' ? 'Appraisal Approved' : 'Appraisal Rejected',
    message:
      event.newStatus === 'approved'
        ? `The appraisal for ${appraisal.periodLabel as string} has been approved.`
        : `The appraisal for ${appraisal.periodLabel as string} was rejected. See the approval history for the reason.`,
    module: 'hr',
    priority: 'medium',
    recipientUid: appraisal.primaryScorerUid as string,
    referenceModule: 'hr',
    referenceId: event.resourceId,
  })
})

/**
 * §8.2/§6.3 — Positions' one-way event: mark every approved template for a
 * revised position as stale, notify HR. Imports only shared/events — never
 * anything under hr/positions/, keeping the dependency arrow one-way.
 */
registerEventHandler('PositionRevised', async (payload) => {
  const positionId = payload.positionId as string
  const staleSnap = await db
    .collection(COLLECTIONS.APPRAISAL_TEMPLATES)
    .where('positionId', '==', positionId)
    .where('templateStatus', '==', 'approved')
    .get()
  if (staleSnap.empty) return

  const batch = db.batch()
  staleSnap.docs.forEach((doc) => batch.update(doc.ref, { templateStatus: 'stale', ...updatedFields('system:events') }))
  await batch.commit()

  await notifyUsersByRole({
    role: 'hrManager',
    module: 'hr',
    priority: 'medium',
    title: 'Appraisal Template Stale',
    message: `Position "${positionId}" was revised — ${staleSnap.size} appraisal template(s) are now stale. Existing in-flight appraisals are unaffected.`,
    referenceId: positionId,
  })
})
