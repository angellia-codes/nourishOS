// ---- Auth ----
export { syncUserClaims } from './auth/syncUserClaims'
export { registerUser } from './auth/registerUser'

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

// ---- Shared: Executive Calendar ----
export { createCalendarEvent, cancelCalendarEvent } from './shared/calendar'

// ---- Security ----
export { createCheckpoint, createPatrolLog, checkOverdueCheckpoints } from './security'

// ---- HR: Appraisal ----
export { seedAppraisalTemplates, createAppraisal, submitAppraisal, generateAppraisalInsights } from './hr/appraisal'

// ---- HR: Employee Database ----
export { createEmployee, updateEmployee, archiveEmployee } from './hr/employees'

// ---- HR: Recruitment (requisitions → candidates → interviews → onboarding) ----
export {
  createRequisition,
  updateRequisition,
  submitRequisition,
  cancelRequisition,
  createCandidate,
  updateCandidate,
  moveCandidateStage,
  scheduleInterview,
  recordInterviewOutcome,
  cancelInterview,
  updateOnboardingItem,
  completeOnboarding,
} from './hr/recruitment'

// ---- Documents: Job Descriptions ----
export {
  createJobDescription,
  updateJobDescription,
  deleteJobDescription,
  setJobDescriptionAccess,
} from './documents/jobDescriptions'

// ---- Documents: SOP Library ----
export { createSop, updateSop, deleteSop, setSopAccess } from './documents/sopLibrary'

// ---- Operations: Lost & Found ----
export {
  createLostFoundItem,
  claimLostFoundItem,
  disposeLostFoundItem,
  checkLostFoundRetention,
} from './operations/lostFound'

// ---- Operations: Incident Reports ----
export { createIncidentReport, updateIncidentStatus, reopenIncident } from './operations/incidentReports'

// ---- Operations: Daily Updates ----
export {
  submitDailyReport,
  carryForwardDailyTasks,
  checkDailyTaskEscalations,
  sendComplianceAlerts,
  sendDailyDigest,
} from './operations/dailyUpdates'
