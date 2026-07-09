import { callFunction } from '@/services/api'
import type { AuditLogEntry } from '@/types'

/**
 * No write function exists in this file, deliberately. Audit entries are
 * generated exclusively by Cloud Functions (recordAuditEvent, internal —
 * see functions/src/lib/audit.ts), never by client code. This service is
 * for the Audit Viewer (audit_log.md §12) only.
 */

export interface SearchAuditLogsInput {
  userId?: string
  module?: string
  resourceType?: string
  severity?: AuditLogEntry['severity']
  startDate?: string // ISO
  endDate?: string // ISO
  cursor?: string
  pageSize?: number
}

export interface SearchAuditLogsResult {
  entries: AuditLogEntry[]
  nextCursor: string | null
}

/**
 * Goes through a Cloud Function rather than a direct Firestore query —
 * audit log visibility is RBAC-scoped per role (AUDIT_LOG.md §17: HR sees
 * HR events only, Finance sees Finance events only, etc.), which is easier
 * to enforce correctly server-side than to express in Security Rules alone.
 */
export function searchAuditLogs(input: SearchAuditLogsInput): Promise<SearchAuditLogsResult> {
  return callFunction('searchAuditLogs', input)
}
