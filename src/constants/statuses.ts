/**
 * Source: APPROVAL_ENGINE.md §5.
 * Note: the plain-English "global workflow standard" (Draft → Submitted →
 * Pending Approval → Approved → Rejected → Completed) maps onto this as
 * "Pending Approval" == PENDING. Using the doc's richer status set since
 * APPROVAL_ENGINE.md is authoritative for this service and already covers
 * revision/cancellation/expiry, which the simplified description doesn't.
 */
export const APPROVAL_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING: 'pending', // == "Pending Approval"
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED_FOR_REVISION: 'returnedForRevision',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS]

/** Source: APPROVAL_ENGINE.md §7. */
export const APPROVAL_ACTION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  RETURN_FOR_REVISION: 'returnForRevision',
  REASSIGN: 'reassign',
  ESCALATE: 'escalate',
  COMMENT: 'comment',
} as const

export type ApprovalAction = (typeof APPROVAL_ACTION)[keyof typeof APPROVAL_ACTION]

/** Source: TASK_ENGINE.md §6, §8. Lifecycle includes optional Accepted/Verified stages. */
export const TASK_STATUS = {
  DRAFT: 'draft',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted', // optional
  IN_PROGRESS: 'inProgress',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  VERIFIED: 'verified', // optional
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue',
  ARCHIVED: 'archived',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

/** Source: TASK_ENGINE.md §7. Shared by Task Engine, Communications tasks, Notification priority. */
export const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

/** Source: TASK_ENGINE.md §4. */
export const TASK_TYPE = {
  APPROVAL: 'approval',
  CHECKLIST: 'checklist',
  REMINDER: 'reminder',
  FOLLOW_UP: 'followUp',
  TRAINING: 'training',
  INSPECTION: 'inspection',
  MAINTENANCE: 'maintenance',
  DOCUMENT_REVIEW: 'documentReview',
  RECRUITMENT: 'recruitment',
  PERFORMANCE_REVIEW: 'performanceReview',
  ASSET_ASSIGNMENT: 'assetAssignment',
  CUSTOM: 'custom',
} as const

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE]

/** Source: NOTIFICATIONS.md §5. Adds Informational on top of the shared PRIORITY set. */
export const NOTIFICATION_PRIORITY = {
  ...PRIORITY,
  INFORMATIONAL: 'informational',
} as const

export type NotificationPriority = (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY]

/** Source: NOTIFICATIONS.md §6 — MVP is in-app only; other channels are future phases. */
export const NOTIFICATION_CHANNEL = {
  IN_APP: 'inApp',
  PUSH: 'push',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL]

/** Source: AUDIT_LOG.md §6. */
export const AUDIT_SEVERITY = {
  ...PRIORITY,
  INFORMATIONAL: 'informational',
} as const

export type AuditSeverity = (typeof AUDIT_SEVERITY)[keyof typeof AUDIT_SEVERITY]

/** Source: FILE_STORAGE.md §4. */
export const SUPPORTED_FILE_TYPES = [
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'txt',
  'csv',
  'jpg',
  'jpeg',
  'png',
  'webp',
] as const

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number]

/** Source: FILE_STORAGE.md §8. */
export const FILE_STATUS = {
  UPLOADING: 'uploading',
  AVAILABLE: 'available',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]

/** Source: API.md §26. */
export const API_ERROR_CODE = {
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  FAILED_PRECONDITION: 'FAILED_PRECONDITION',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  INTERNAL: 'INTERNAL',
  UNAVAILABLE: 'UNAVAILABLE',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE]
