import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'
import { registerApprovalResolvedHandler } from '../approval'

export { createCalendarEvent, cancelCalendarEvent, createCalendarEventInternal } from './events'

/**
 * Module-load-time registration (shared/approval/registry.ts): when the
 * 'calendar/companyEvent' route resolves, mirror the outcome onto the event —
 * §9.2-F10. Same shape as hr/recruitment/index.ts's 'requisition' handler.
 */
registerApprovalResolvedHandler('companyEvent', async (event) => {
  const ref = db.collection(COLLECTIONS.CALENDAR_EVENTS).doc(event.resourceId)
  const snap = await ref.get()
  if (!snap.exists) {
    logger.warn(`Approval ${event.approvalRequestId} resolved for missing calendar event ${event.resourceId}`)
    return
  }

  const approved = event.newStatus === 'approved'
  await ref.update({
    eventStatus: approved ? 'confirmed' : 'cancelled',
    cancellationReason: approved ? null : 'Not approved.',
    status: approved ? 'confirmed' : 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system:approvalEngine',
  })
})
