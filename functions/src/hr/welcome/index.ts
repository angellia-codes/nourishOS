import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, updatedFields } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { findLatestInvite } from './invite'

export { issueWelcomeInvite, reissueWelcomeInvite, revokeWelcomeInvite } from './issueWelcomeInvite'
export { updateWelcomeContent, publishWelcomeContent, WELCOME_SECTIONS } from './content'
export { seedWelcomeContent } from './seedWelcomeContent'
export { getWelcomeSession, saveWelcomeDraft, getWelcomeContent } from './portal/session'
export { uploadWelcomeDocument } from './portal/uploadWelcomeDocument'
export { submitWelcomeForm } from './portal/submitWelcomeForm'

const SYSTEM_ACTOR = 'system:approvalEngine'

/**
 * welcome-portal.md §3.3 step 7 / §3.4 — resolution of the
 * 'hr/onboardingVerification' step is what moves a hire from "submitted" to
 * "verified".
 *
 * Rejection deliberately re-opens the form rather than closing the case: the
 * invite's `lockedAt` is cleared so the hire can correct what HR flagged, and
 * the reason is stored on the employee so the portal can show it. If the
 * 30-day token has already expired by then, HR reissues — the unlock is
 * necessary but not sufficient, exactly as §3.4's table says.
 */
registerApprovalResolvedHandler('onboardingVerification', async (event) => {
  const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(event.resourceId)
  const snap = await employeeRef.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing employee ${event.resourceId}`)
    return
  }

  if (event.newStatus === 'approved') {
    await employeeRef.update({
      onboardingStatus: 'verified',
      onboardingVerifiedAt: new Date().toISOString(),
      // The approval request holds who approved each step; this is the
      // denormalised copy the employee profile renders without a second read.
      onboardingVerifiedBy: await resolveApprover(event.approvalRequestId),
      onboardingRejectionReason: null,
      ...updatedFields(SYSTEM_ACTOR),
    })
    logger.info(`Onboarding data verified for employee ${event.resourceId}.`)
    return
  }

  const reason = await resolveRejectionComment(event.approvalRequestId)
  await employeeRef.update({
    onboardingStatus: 'invited',
    onboardingRejectionReason: reason,
    ...updatedFields(SYSTEM_ACTOR),
  })

  const invite = await findLatestInvite(event.resourceId)
  if (invite && !invite.data().revokedAt) {
    await invite.ref.update({ lockedAt: null, ...updatedFields(SYSTEM_ACTOR) })
  }
  logger.info(`Onboarding data rejected for employee ${event.resourceId} — form re-opened.`)
})

/**
 * Both answers come from `approvalHistory`, which is where approveStep and
 * rejectStep write the actor and the comment. A bare equality on
 * `approvalRequestId` — sorting and filtering happen in memory, so this needs
 * no composite index for a trail that is one row long on a single-step route.
 */
async function loadHistory(approvalRequestId: string): Promise<FirebaseFirestore.DocumentData[]> {
  const snap = await db
    .collection(COLLECTIONS.APPROVAL_HISTORY)
    .where('approvalRequestId', '==', approvalRequestId)
    .get()
  return snap.docs.map((doc) => doc.data()).sort((a, b) => ((a.stepIndex as number) ?? 0) - ((b.stepIndex as number) ?? 0))
}

async function resolveApprover(approvalRequestId: string): Promise<string> {
  const history = await loadHistory(approvalRequestId)
  const approvals = history.filter((entry) => String(entry.action ?? '').startsWith('approve'))
  return (approvals[approvals.length - 1]?.approverUid as string | undefined) ?? SYSTEM_ACTOR
}

/** §5.1 — "Rejection requires a reason", so there is always one to surface. */
async function resolveRejectionComment(approvalRequestId: string): Promise<string | null> {
  const history = await loadHistory(approvalRequestId)
  const rejection = history.find((entry) => String(entry.action ?? '').startsWith('reject'))
  return (rejection?.comments as string | undefined) ?? null
}
