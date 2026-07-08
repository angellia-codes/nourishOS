import type { Timestamp } from 'firebase/firestore'
import type { AuditSeverity } from '@/constants/statuses'

/**
 * Source: AUDIT_LOG.md §5. Immutable, write-once, generated only by Cloud
 * Functions (AUDIT_LOG.md §8: "Business modules should not write directly
 * to the audit collection"). This type exists for reading/displaying logs
 * only — there is no client-side create/update function for it.
 */
export interface AuditLogEntry {
  id: string
  timestamp: Timestamp
  eventType: string
  category: string
  module: string
  resourceType: string
  resourceId: string
  action: string
  userId: string
  userName: string
  userRole: string
  departmentId?: string
  outletId?: string
  severity: AuditSeverity
  previousValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
