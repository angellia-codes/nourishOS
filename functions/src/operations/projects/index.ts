import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../../shared/approval'
import { sendNotificationInternal } from '../../shared/notifications'

export { createProject, updateProject, submitProject, moveProjectColumn } from './projects'

/**
 * Module-load-time registration (shared/approval/registry.ts): when the
 * 'operations/project' route resolves, mirror the outcome onto the project —
 * HR_OPERATIONS.md §9.10. Same shape as recruitment's 'requisition' handler.
 *
 * This is the only place a project reaches the board: `column` stays 'backlog'
 * until an approval says otherwise, so §9.8's kanban can never show work that
 * was never signed off.
 */
registerApprovalResolvedHandler('project', async (event) => {
  const ref = db.collection(COLLECTIONS.PROJECTS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing project ${event.resourceId}`)
    return
  }
  const project = snap.data()!
  const approved = event.newStatus === 'approved'

  await ref.update({
    status: approved ? 'active' : event.newStatus,
    column: approved ? 'todo' : 'backlog',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })

  const ownerUid = (project.ownerUid as string | undefined) ?? (project.createdBy as string | undefined)
  if (ownerUid) {
    await sendNotificationInternal({
      type: 'alert',
      title: approved ? 'Project Approved' : 'Project Not Approved',
      message: approved
        ? `"${project.name as string}" is approved and now on the board.`
        : `"${project.name as string}" was not approved.`,
      module: 'operations',
      priority: 'medium',
      recipientUid: ownerUid,
      referenceModule: 'operations',
      referenceId: event.resourceId,
      actionUrl: `/operations/projects/${event.resourceId}`,
    })
  }
})
