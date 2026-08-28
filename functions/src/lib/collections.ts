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
  POSITIONS: 'positions',

  EMPLOYEES: 'employees',
  EMPLOYEE_ACTIVITIES: 'employeeActivities',
  DISCIPLINARY_ACTIONS: 'disciplinaryActions',
  CONTRACTS: 'contracts',
  TRAININGS: 'trainings',
  TRAINING_TOPICS: 'trainingTopics',
  TRAINING_BINDINGS: 'trainingBindings',
  TRAINING_ASSIGNMENTS: 'trainingAssignments',
  DEPARTMENTS: 'departments',
  HR_INVENTORY_ITEMS: 'hrInventoryItems',
  HR_STOCK_LEVELS: 'hrStockLevels',
  HR_STOCK_MOVEMENTS: 'hrStockMovements',
  PAYROLL_RECORDS: 'payrollRecords',
  MONTHLY_REVENUE: 'monthlyRevenue',
  // Payroll Components & Payslip (payroll-components-payslip-design.md §4).
  // PAYROLL_RECORDS above is the superseded flat model — historical, read-only.
  PAYROLL_COMPONENTS: 'payrollComponents',
  PAYROLL_PARAMETERS: 'payrollParameters',
  PAYROLL_BATCHES: 'payrollBatches',
  PAYSLIPS: 'payslips',
  EMPLOYEE_ENGAGEMENTS: 'employeeEngagements',
  // Attendance (attendance.md §3) — monthly aggregate ledger, company-wide
  // periods with one record per employee per period.
  ATTENDANCE_PERIODS: 'attendancePeriods',
  ATTENDANCE_RECORDS: 'attendanceRecords',

  RECRUITMENTS: 'recruitments',
  CANDIDATES: 'candidates',
  INTERVIEWS: 'interviews',
  DISC_RESULTS: 'discResults',
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
  ANNOUNCEMENT_WISHES: 'announcementWishes',
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
  COMPANY_FORMS: 'companyForms',

  CHECKPOINTS: 'checkpoints',
  PATROL_LOGS: 'patrolLogs',
  FIRE_EXTINGUISHERS: 'fireExtinguishers',
  FIRE_EXTINGUISHER_INSPECTIONS: 'fireExtinguisherInspections',

  DAILY_REPORTS: 'dailyReports',
  PROJECTS: 'projects',
  INCIDENT_REPORTS: 'incidentReports',
  WORK_ORDERS: 'workOrders',
  LOST_FOUND_ITEMS: 'lostFoundItems',
  SHIFT_HANDOVERS: 'shiftHandovers',
  // equipment-master-design.md §3.2. EQUIPMENT_INSPECTIONS (client mirror) stays
  // unused — reserved for Module B / a future shared inspection engine.
  EQUIPMENT: 'equipment',

  EXPENSE_REQUESTS: 'expenseRequests',

  SYSTEM_SETTINGS: 'systemSettings',
  INTEGRATIONS: 'integrations',
} as const
