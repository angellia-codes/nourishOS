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
  DISCIPLINARY_ACTIONS: 'disciplinaryActions',
  CONTRACTS: 'contracts',
  TRAININGS: 'trainings',
  TRAINING_ASSIGNMENTS: 'trainingAssignments',
  HR_INVENTORY_ITEMS: 'hrInventoryItems',
  HR_STOCK_LEVELS: 'hrStockLevels',
  HR_STOCK_MOVEMENTS: 'hrStockMovements',

  RECRUITMENTS: 'recruitments',
  CANDIDATES: 'candidates',
  INTERVIEWS: 'interviews',
  ONBOARDING_CHECKLISTS: 'onboardingChecklists',
  OFFBOARDING_CHECKLISTS: 'offboardingChecklists',
  EXIT_INTERVIEWS: 'exitInterviews',

  APPROVAL_WORKFLOWS: 'approvalWorkflows',
  APPROVAL_REQUESTS: 'approvalRequests',
  APPROVAL_STEPS: 'approvalSteps',
  APPROVAL_HISTORY: 'approvalHistory',

  TASKS: 'tasks',
  TASK_COMMENTS: 'taskComments',

  NOTIFICATIONS: 'notifications',

  ANNOUNCEMENTS: 'announcements',
  ANNOUNCEMENT_READS: 'announcementReads',
  CHAT_CHANNELS: 'chatChannels',
  CHAT_MESSAGES: 'chatMessages',
  MENTIONS: 'mentions',
  ACTIVITY_FEED: 'activityFeed',
  COMMUNICATION_SETTINGS: 'communicationSettings',

  AUDIT_LOGS: 'auditLogs',

  FILES: 'files',

  CALENDAR_EVENTS: 'calendarEvents',

  JOB_DESCRIPTIONS: 'jobDescriptions',
  SOPS: 'sops',
  TEMPLATES: 'templates',
  COMPANY_FORMS: 'companyForms',

  CHECKPOINTS: 'checkpoints',
  PATROL_LOGS: 'patrolLogs',

  DAILY_REPORTS: 'dailyReports',
  INCIDENT_REPORTS: 'incidentReports',
  WORK_ORDERS: 'workOrders',
  LOST_FOUND_ITEMS: 'lostFoundItems',
  OPENING_CHECKLISTS: 'openingChecklists',
  CLOSING_CHECKLISTS: 'closingChecklists',

  EXPENSE_REQUESTS: 'expenseRequests',

  SYSTEM_SETTINGS: 'systemSettings',
} as const
