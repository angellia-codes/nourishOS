import { FieldValue } from 'firebase-admin/firestore'
import { db, COLLECTIONS } from '../../lib'

export interface RecordActivityInternalInput {
  eventType: string
  module: string
  title: string
  resourceType: string
  resourceId: string
  actorUid?: string | null
  actionUrl?: string | null
}

/**
 * Communications module — activityFeed (communications.md §10).
 *
 * Internal only, not a callable — mirrors sendNotificationInternal's shape:
 * every module that wants an entry on the company-wide activity feed calls
 * this from inside its own already-authorized callable, right after its
 * recordAuditEvent call. auditLogs is deliberately not reused as the source
 * here — it is deny-all to clients by design (AUDIT_LOG.md §17) and its
 * entries are resource-centric audit records, not feed-shaped human-readable
 * lines, so a separate purpose-built collection avoids overloading either
 * one's semantics.
 */
export async function recordActivityInternal(input: RecordActivityInternalInput): Promise<void> {
  await db.collection(COLLECTIONS.ACTIVITY_FEED).add({
    eventType: input.eventType,
    module: input.module,
    title: input.title,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUid: input.actorUid ?? null,
    actionUrl: input.actionUrl ?? null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.actorUid ?? 'system',
    status: 'active',
    isArchived: false,
  })
}
