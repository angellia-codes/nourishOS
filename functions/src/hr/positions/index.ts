import { logger } from 'firebase-functions/v2'
import { db, COLLECTIONS, updatedFields } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { emitEvent } from '../../shared/events'

export { seedPositions } from './seedPositions'
export { createPosition } from './createPosition'
export { updatePosition } from './updatePosition'
export { archivePosition } from './archivePosition'
export { setAppraisalScorer } from './setAppraisalScorer'
export { migrateEmployeePositions } from './migrateEmployeePositions'

/**
 * §8.1/§8.2 — resolution of the 'hr/position' approval chain is what
 * actually applies an edit: updatePosition only stages `pendingChanges`,
 * this merges them onto the live fields, bumps `revision`, and emits
 * `PositionRevised` so Appraisal v2 can mark affected templates stale
 * (§6.3). A brand-new createPosition has no pendingChanges to merge — it
 * just clears the pending state.
 */
registerApprovalResolvedHandler('position', async (event) => {
  const ref = db.collection(COLLECTIONS.POSITIONS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing position ${event.resourceId}`)
    return
  }
  const position = snap.data()!
  const pendingChanges = (position.pendingChanges as Record<string, unknown> | undefined) ?? null

  if (event.newStatus === 'approved') {
    const update: Record<string, unknown> = {
      status: 'active',
      pendingChanges: null,
      approvalRequestId: null,
      ...updatedFields('system:approvalEngine'),
    }
    if (pendingChanges && Object.keys(pendingChanges).length > 0) {
      Object.assign(update, pendingChanges)
      update.revision = ((position.revision as number | undefined) ?? 1) + 1
    }
    await ref.update(update)

    await emitEvent('PositionRevised', {
      positionId: position.positionId,
      revision: update.revision ?? position.revision,
      departmentId: (update.departmentId as string | undefined) ?? position.departmentId,
    })
  } else {
    // rejected — an edit reverts to the previous stable content (nothing to
    // undo, pendingChanges is simply discarded); a rejected brand-new
    // position has no prior stable state, so it stays a visible 'rejected'
    // record rather than silently disappearing.
    await ref.update({
      status: pendingChanges && Object.keys(pendingChanges).length > 0 ? 'active' : 'rejected',
      pendingChanges: null,
      approvalRequestId: null,
      ...updatedFields('system:approvalEngine'),
    })
  }
})
