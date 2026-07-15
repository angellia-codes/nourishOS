// ---- Auth ----
export { syncUserClaims } from './auth/syncUserClaims'

// ---- Shared: Approval Engine ----
export {
  submitApproval,
  approveStep,
  rejectStep,
  returnForRevision,
  cancelApproval,
  onApprovalRequestResolved,
} from './shared/approval'

// ---- Shared: Task Engine ----
export { createTask, assignTask, completeTask, cancelTask } from './shared/tasks'

// ---- Shared: Notifications ----
export { markNotificationRead, markAllNotificationsRead } from './shared/notifications'

// ---- Shared: File Storage ----
export { createFileMetadata, deleteFile } from './shared/fileStorage'

// ---- Security ----
export { createCheckpoint, createPatrolLog, checkOverdueCheckpoints } from './security'

// ---- HR: Appraisal ----
export { seedAppraisalTemplates, createAppraisal, submitAppraisal, generateAppraisalInsights } from './hr/appraisal'

// ---- HR: Employee Database ----
export { createEmployee, updateEmployee, archiveEmployee } from './hr/employees'
