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
export {
  createCheckpoint,
  updateCheckpoint,
  archiveCheckpoint,
  createPatrolLog,
  checkOverdueCheckpoints,
  // fire-extinguisher.md — APAR register, monthly rounds, expiry monitoring.
  registerFireExtinguisher,
  updateFireExtinguisher,
  retireFireExtinguisher,
  submitAparInspection,
  generateMonthlyAparRounds,
  checkAparExpiry,
} from './security'

// ---- HR: Appraisal v2 ----
export {
  generateAppraisalTemplate,
  approveAppraisalTemplate,
  createAppraisal,
  submitPrimaryScores,
  submitSecondaryScores,
  acknowledgeAppraisal,
  reopenAppraisal,
  getAppraisalRecommendation,
  generateAppraisalInsights,
  scheduleAppraisalCycles,
} from './hr/appraisal'

// ---- HR: Positions Master ----
export {
  seedPositions,
  createPosition,
  updatePosition,
  archivePosition,
  setAppraisalScorer,
  migrateEmployeePositions,
} from './hr/positions'

// ---- HR: Payroll & Revenue ----
// Payroll Components & Payslip (payroll-components-payslip-design.md §7).
// `importPayroll` and its flat payrollRecords model were retired here on
// 2026-08-26 — superseded by the batch/payslip model below.
export {
  parsePayrollCsv,
  createPayrollBatch,
  submitPayrollBatch,
  supersedePayslip,
  upsertPayrollComponent,
  seedPayrollComponents,
  upsertPayrollParameters,
  recordMonthlyRevenue,
  getManningCostSummary,
} from './hr/payroll'

// ---- HR: Attendance ----
// attendance.md — monthly aggregate ledger: CSV import, HR Manager -> GM
// approval, immutable-once-approved records with a supersede-on-correction
// pattern.
export {
  previewAttendanceImport,
  importAttendancePeriod,
  submitAttendancePeriod,
  remindAttendanceImport,
} from './hr/attendance'

// ---- HR: Employee Engagement ----
export { createEngagement, updateEngagement } from './hr/engagement'

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
// training-module-spec-v1.0.md — the canonical catalogue replaced the flat
// createTraining/updateTraining/assignTraining/completeTraining set.
export {
  seedTrainingCatalog,
  generateTrainingAssignments,
  verifyTrainingCompletion,
  overrideTrainingGate,
} from './hr/training'

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

// ---- Documents: Company Forms ----
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

// ---- Communications: Milestone announcements (birthday / anniversary / new hire / farewell) ----
export { milestoneAnnouncements, sendMilestoneWish } from './communications/milestoneAnnouncements'

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

// ---- Engineering: Equipment Master ----
export {
  createEquipment,
  updateEquipment,
  updateEquipmentStatus,
  transferEquipmentOutlet,
  requestEquipmentDecommission,
  previewEquipmentImport,
  commitEquipmentImport,
} from './operations/equipment'

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
