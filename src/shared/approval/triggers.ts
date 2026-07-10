import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { REGION } from '../../lib'
import { getApprovalResolvedHandler } from './registry'

const TERMINAL_STATUSES = ['approved', 'rejected']

/**
 * Fires exactly once per transition INTO approved/rejected (not on every
 * update to the doc) — checked via before/after status comparison so a
 * step-advance update on a still-pending multi-step request doesn't
 * spuriously trigger module handlers.
 */
export const onApprovalRequestResolved = onDocumentUpdated(
  { document: 'approvalRequests/{requestId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()
    if (!before || !after) return

    const wasTerminal = TERMINAL_STATUSES.includes(before.approvalStatus)
    const isTerminal = TERMINAL_STATUSES.includes(after.approvalStatus)
    if (wasTerminal || !isTerminal) return

    const handler = getApprovalResolvedHandler(after.resourceType)
    if (!handler) {
      logger.warn(`No approval-resolved handler registered for resourceType "${after.resourceType}"`)
      return
    }

    await handler({
      approvalRequestId: event.params.requestId,
      module: after.module,
      resourceType: after.resourceType,
      resourceId: after.resourceId,
      newStatus: after.approvalStatus as 'approved' | 'rejected',
    })
  },
)
