/**
 * Known duplication: src/constants/collections.ts is the frontend's source
 * of truth. functions/ is a separate package (own package.json/tsconfig),
 * so it can't import from src/ without a monorepo workspace setup — out of
 * scope for this milestone. Keep these two files in sync by hand for now;
 * flagging this as tech debt rather than pretending it isn't duplication.
 */
export const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',

  APPRAISAL_TEMPLATES: 'appraisalTemplates',
  APPRAISALS: 'appraisals',

  EMPLOYEES: 'employees',
  EMPLOYEE_ACTIVITIES: 'employeeActivities',

  APPROVAL_WORKFLOWS: 'approvalWorkflows',
  APPROVAL_REQUESTS: 'approvalRequests',
  APPROVAL_STEPS: 'approvalSteps',
  APPROVAL_HISTORY: 'approvalHistory',

  TASKS: 'tasks',

  NOTIFICATIONS: 'notifications',

  AUDIT_LOGS: 'auditLogs',

  FILES: 'files',

  CHECKPOINTS: 'checkpoints',
  PATROL_LOGS: 'patrolLogs',

  DAILY_REPORTS: 'dailyReports',
  INCIDENT_REPORTS: 'incidentReports',
  WORK_ORDERS: 'workOrders',
  LOST_FOUND_ITEMS: 'lostFoundItems',

  SYSTEM_SETTINGS: 'systemSettings',
} as const
