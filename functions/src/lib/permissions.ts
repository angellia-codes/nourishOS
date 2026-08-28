/**
 * Known duplication (see collections.ts) — mirrors the subset of
 * src/constants/permissions.ts actually checked by Cloud Functions.
 */
export const PERMISSIONS = {
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_READ_SENSITIVE: 'employees.readSensitive',
  EMPLOYEES_COMMUNICATE: 'employees.communicate',
  EXIT_INTERVIEWS_VIEW: 'exitInterviews.view',
  RECRUITMENT_READ: 'recruitment.read',
  RECRUITMENT_CREATE: 'recruitment.create',
  RECRUITMENT_UPDATE: 'recruitment.update',
  RECRUITMENT_APPROVE: 'recruitment.approve',
  RECRUITMENT_VIEW_COMPENSATION: 'recruitment.viewCompensation',
  RECRUITMENT_VIEW_SENSITIVE: 'recruitment.viewSensitive',
  APPRAISALS_CREATE: 'appraisals.create',
  APPRAISALS_SUBMIT: 'appraisals.submit',
  APPRAISALS_GENERATE_INSIGHTS: 'appraisals.generateInsights',
  APPRAISALS_MANAGE_TEMPLATES: 'appraisals.manageTemplates',
  APPRAISALS_SCORE_PRIMARY: 'appraisals.scorePrimary',
  APPRAISALS_SCORE_SECONDARY: 'appraisals.scoreSecondary',
  APPRAISALS_READ_RECOMMENDATION: 'appraisals.readRecommendation',
  APPRAISALS_ACKNOWLEDGE: 'appraisals.acknowledge',
  APPRAISALS_REOPEN: 'appraisals.reopen',
  APPRAISAL_TEMPLATES_GENERATE: 'appraisalTemplates.generate',
  APPRAISAL_TEMPLATES_APPROVE: 'appraisalTemplates.approve',
  POSITIONS_CREATE: 'positions.create',
  POSITIONS_UPDATE: 'positions.update',
  POSITIONS_ARCHIVE: 'positions.archive',
  POSITIONS_SET_SCORER: 'positions.setScorer',
  POSITIONS_SEED: 'positions.seed',
  TRAINING_READ: 'training.read',
  TRAINING_ASSIGN: 'training.assign',
  // training-module-spec-v1.0.md §5 — catalogue/override vs trainee sign-off.
  TRAINING_MANAGE: 'training.manage',
  TRAINING_VERIFY: 'training.verify',
  PATROLS_CREATE: 'security.create',
  CHECKPOINTS_MANAGE: 'security.manageCheckpoints',
  // fire-extinguisher.md §7 — register ownership vs performing an inspection.
  APAR_MANAGE: 'apar.manage',
  APAR_INSPECT: 'apar.inspect',
  // equipment-master-design.md §6.1 — import is separated from manage
  // because a bulk commit can rewrite the whole register in one action.
  EQUIPMENT_MANAGE: 'equipment.manage',
  EQUIPMENT_IMPORT: 'equipment.import',
  EQUIPMENT_DECOMMISSION: 'equipment.decommission',
  LOST_FOUND_CREATE: 'lostFound.create',
  LOST_FOUND_MANAGE: 'lostFound.manage',
  INCIDENTS_CREATE: 'incidents.create',
  INCIDENTS_MANAGE: 'incidents.manage',
  DAILY_UPDATES_SUBMIT: 'dailyUpdates.submit',
  CALENDAR_CREATE: 'calendar.create',
  CALENDAR_MANAGE: 'calendar.manage',
  EXPENSE_REQUESTS_SUBMIT: 'expenseRequests.submit',
  // New: approving an expense and disbursing the money are different actions
  // with different risk (expense-request.md §7), so they don't share a string.
  EXPENSE_REQUESTS_PAY: 'expenseRequests.pay',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  ANNOUNCEMENTS_PUBLISH: 'announcements.publish',
  ANNOUNCEMENTS_BROADCAST: 'announcements.broadcast',
  HR_INVENTORY_MANAGE: 'hrInventory.manage',
  HR_INVENTORY_RECORD: 'hrInventory.record',
  WORK_ORDERS_CREATE: 'workOrders.create',
  WORK_ORDERS_ASSIGN: 'workOrders.assign',
  WORK_ORDERS_UPDATE: 'workOrders.update',
  WORK_ORDERS_COMPLETE: 'workOrders.complete',
  DOCUMENTS_PUBLISH: 'documents.publish',
  SHIFT_REPORTS_SUBMIT: 'shiftReports.submit',
  SHIFT_REPORTS_READ: 'shiftReports.read',
  SHIFT_REPORTS_READ_ALL: 'shiftReports.readAll',
  CHAT_SEND: 'chat.send',
  CHAT_MANAGE_CHANNELS: 'chat.manageChannels',
  // HR_OPERATIONS.md §7.3 — Project Management. `create` raises a project for
  // GM approval; `manage` moves it across the board and edits it after that.
  PROJECTS_READ: 'projects.read',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_MANAGE: 'projects.manage',
  // §7.3 contracts.sign — the GM/Director digital-signature step (§9.14).
  CONTRACTS_SIGN: 'contracts.sign',
  // Mirrored for the GM Flash Report callable (§9.12-F09 / Epic E12).
  REPORTS_READ: 'reports.read',
  // Previously missing from this mirror — src/constants/permissions.ts has
  // had it since the GM Flash Report shipped. Reused here for recordMonthlyRevenue.
  REPORTS_CREATE: 'reports.create',
  // Payroll Components & Payslip (payroll-components-payslip-design.md §8).
  PAYROLL_READ: 'payroll.read',
  PAYROLL_IMPORT: 'payroll.import',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_MANAGE_COMPONENTS: 'payroll.manageComponents',
  PAYROLL_MANAGE_PARAMETERS: 'payroll.manageParameters',
  EMPLOYEE_ENGAGEMENT_MANAGE: 'employeeEngagement.manage',
  // Attendance (attendance.md §8).
  ATTENDANCE_IMPORT: 'attendance.import',
  ATTENDANCE_APPROVE: 'attendance.approve',
  ATTENDANCE_VIEW_ALL_OUTLETS: 'attendance.viewAllOutlets',
  ATTENDANCE_VIEW_OWN_OUTLET: 'attendance.viewOwnOutlet',
  ATTENDANCE_EXPORT: 'attendance.export',
} as const
