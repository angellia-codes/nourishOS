/**
 * Known duplication (see collections.ts) — mirrors the subset of
 * src/constants/permissions.ts actually checked by Cloud Functions.
 */
export const PERMISSIONS = {
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_READ_SENSITIVE: 'employees.readSensitive',
  EXIT_INTERVIEWS_VIEW: 'exitInterviews.view',
  RECRUITMENT_READ: 'recruitment.read',
  RECRUITMENT_CREATE: 'recruitment.create',
  RECRUITMENT_UPDATE: 'recruitment.update',
  RECRUITMENT_APPROVE: 'recruitment.approve',
  RECRUITMENT_VIEW_COMPENSATION: 'recruitment.viewCompensation',
  APPRAISALS_CREATE: 'appraisals.create',
  APPRAISALS_SUBMIT: 'appraisals.submit',
  APPRAISALS_GENERATE_INSIGHTS: 'appraisals.generateInsights',
  APPRAISALS_MANAGE_TEMPLATES: 'appraisals.manageTemplates',
  TRAINING_READ: 'training.read',
  TRAINING_ASSIGN: 'training.assign',
  PATROLS_CREATE: 'security.create',
  CHECKPOINTS_MANAGE: 'security.manageCheckpoints',
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
  WORK_ORDERS_ASSIGN: 'workOrders.assign',
  WORK_ORDERS_UPDATE: 'workOrders.update',
  WORK_ORDERS_COMPLETE: 'workOrders.complete',
  DOCUMENTS_PUBLISH: 'documents.publish',
  CHECKLISTS_RECORD: 'checklists.record',
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
} as const
