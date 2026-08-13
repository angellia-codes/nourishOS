import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { db } from './admin'
import { COLLECTIONS } from './collections'
import type { AuthedUser } from './rbac'

/** Mirrors the read-side AuditLogEntry in src/types/audit.types.ts (AUDIT_LOG.md §5). */
export interface RecordAuditEventInput {
  eventType: string
  category: string
  module: string
  resourceType: string
  resourceId: string
  action: string
  user: AuthedUser
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  previousValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Appends one immutable entry to auditLogs (AUDIT_LOG.md §8: only Cloud
 * Functions write here; rules deny all client access). Called AFTER the
 * mutation it describes has committed — so a failure here is logged loudly
 * but never thrown, to avoid failing an operation that already happened.
 */
export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  try {
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      timestamp: FieldValue.serverTimestamp(),
      eventType: input.eventType,
      category: input.category,
      module: input.module,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      userId: input.user.uid,
      userName: input.user.displayName,
      userRole: input.user.roleId,
      departmentId: input.user.departmentId ?? null,
      outletId: input.user.outletId ?? null,
      severity: input.severity ?? 'informational',
      previousValues: input.previousValues ?? null,
      newValues: input.newValues ?? null,
      metadata: input.metadata ?? null,
    })
  } catch (error) {
    logger.error(`Failed to record audit event ${input.eventType} for ${input.resourceType}/${input.resourceId}`, error)
  }
}
