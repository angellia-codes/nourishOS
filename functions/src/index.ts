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
export { createTask, assignTask, completeTask, cancelTask, addTaskComment } from './shared/tasks'

// ---- Shared: Notifications ----
export { markNotificationRead, markAllNotificationsRead } from './shared/notifications'

// ---- Shared: File Storage ----
export { createFileMetadata, deleteFile } from './shared/fileStorage'

// ---- Shared: Executive Calendar ----
export { createCalendarEvent, cancelCalendarEvent, syncCalendarEvents } from './shared/calendar'

// ---- Security ----
export { createCheckpoint, createPatrolLog, checkOverdueCheckpoints } from './security'

// ---- HR: Appraisal ----
export {
  seedAppraisalTemplates,
  createAppraisal,
  submitAppraisal,
  generateAppraisalInsights,
  triggerProbationReviews,
} from './hr/appraisal'

// ---- HR: Employee Database ----
export {
  createEmployee,
  updateEmployee,
  updateEmployeeCompensation,
  archiveEmployee,
  importEmployees,
  getEmployeeAuditLog,
  contractAlerts,
  createDisciplinaryRecord,
  updateDisciplinaryRecord,
  submitCommunicationRecord,
  submitEmployeeStatement,
  acknowledgeCommunicationRecord,
  addInvestigationNote,
  closeDisciplinaryRecord,
  expireCommunicationRecords,
  updateOffboardingItem,
  completeOffboarding,
  submitExitInterview,
  getExitInterviewInsights,
} from './hr/employees'

// ---- HR: Inventory (uniforms & assets) ----
export { createInventoryItem, updateInventoryItem, receiveStock, issueStock, transferStock } from './hr/inventory'

// ---- HR: Employment Contracts ----
export { renewContract, terminateContract, submitContractForSigning } from './hr/contracts'

// ---- HR: Training ----
export { createTraining, updateTraining, assignTraining, completeTraining } from './hr/training'

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
  updateRequisitionCompensation,
  sendInterviewReminders,
  // Candidate Portal — unauthenticated, token-authenticated (candidate_portal.md).
  listOpenPositions,
  startApplication,
  saveApplicationForm,
  uploadCandidateDocument,
  getDiscQuestions,
  submitDiscAssessment,
  completeApplication,
  getApplicationStatus,
} from './recruitment'

// ---- Documents: Job Descriptions ----
export {
  createJobDescription,
  updateJobDescription,
  deleteJobDescription,
  setJobDescriptionAccess,
} from './documents/jobDescriptions'

// ---- Documents: SOP Library ----
export { createSop, updateSop, deleteSop, setSopAccess } from './documents/sopLibrary'

// ---- Documents: Company Forms + Templates ----
export { createDocumentResource, updateDocumentResource, deleteDocumentResource } from './documents/resources'

// ---- Finance: Expense Requests ----
export {
  createExpenseRequest,
  updateExpenseRequest,
  submitExpenseRequest,
  markExpensePaid,
  closeExpenseRequest,
} from './finance'

// ---- Communications: Announcements (Broadcast is the emergency category) ----
export {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  recordAnnouncementRead,
} from './communications/announcements'

// ---- Communications: Team Chat ----
export { createChannel, sendMessage } from './communications/chat'

// ---- Communications: Communication Settings ----
export { updateCommunicationSettings } from './communications/communicationSettings'

// ---- Operations: Work Orders ----
export { createWorkOrder, updateWorkOrderStatus, checkWorkOrderEscalations } from './operations/workOrders'

// ---- Operations: Project Management ----
export { createProject, updateProject, submitProject, moveProjectColumn } from './operations/projects'

// ---- Operations: Shift Reports ----
export { submitShiftReport } from './operations/shiftReports'

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

// ---- Reports: GM Flash Report ----
export { sendFlashReport, generateFlashReport } from './reports'

// ---- Settings: Roles & Permissions ----
export { updateRolePermissions } from './settings'
