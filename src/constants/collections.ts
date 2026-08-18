/**
 * Firestore collection names, grouped by domain.
 *
 * Note on approvals: DATABASE.md/FIRESTORE_SCHEMA.md model a single
 * "approvalFlows" collection with an embedded steps array.
 * APPROVAL_ENGINE.md (the dedicated shared-service spec) normalizes this
 * into workflows/requests/steps/history. Using the normalized version
 * below since APPROVAL_ENGINE.md is authoritative for this service —
 * recommend updating DATABASE.md to match.
 */
export const COLLECTIONS = {
  // Core
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  DEPARTMENTS: 'departments',
  OUTLETS: 'outlets',

  // HR
  EMPLOYEES: 'employees',
  RECRUITMENTS: 'recruitments',
  CANDIDATES: 'candidates',
  INTERVIEWS: 'interviews',
  ONBOARDING_CHECKLISTS: 'onboardingChecklists',
  OFFBOARDING_CHECKLISTS: 'offboardingChecklists',
  EXIT_INTERVIEWS: 'exitInterviews',
  CONTRACTS: 'contracts',
  // NOTE: 'performances' (DATABASE.md §13 / FIRESTORE_SCHEMA.md §13) is a loose
  // generic shape (employeeId, reviewerId, score, comments) — superseded by the
  // structured Appraisal module below. Recommend deprecating this collection
  // once Appraisal ships rather than maintaining both shapes for the same data.
  PERFORMANCES: 'performances',
  APPRAISAL_TEMPLATES: 'appraisalTemplates',
  APPRAISALS: 'appraisals',
  DISCIPLINARY_ACTIONS: 'disciplinaryActions',
  TRAININGS: 'trainings',
  TRAINING_ASSIGNMENTS: 'trainingAssignments',
  EMPLOYEE_ASSETS: 'employeeAssets',
  EMPLOYEE_ACTIVITIES: 'employeeActivities',
  // HR Inventory (uniforms & assets) — the only inventory concept in the
  // app; the separate top-level F&B warehouse module was cut (2026-08-15),
  // see CLAUDE.md "Current state of the tree".
  HR_INVENTORY_ITEMS: 'hrInventoryItems',
  HR_STOCK_LEVELS: 'hrStockLevels',
  HR_STOCK_MOVEMENTS: 'hrStockMovements',

  // Documents
  SOPS: 'sops',
  DOCUMENTS: 'documents',
  JOB_DESCRIPTIONS: 'jobDescriptions',
  DOCUMENT_VERSIONS: 'documentVersions',
  DOCUMENT_CATEGORIES: 'documentCategories',
  DOCUMENT_TAGS: 'documentTags',
  DOCUMENT_APPROVALS: 'documentApprovals',
  TEMPLATES: 'templates',
  COMPANY_FORMS: 'companyForms',
  TRAINING_MODULES: 'trainingModules',
  KNOWLEDGE_BASE: 'knowledgeBase',
  DOCUMENT_ACKNOWLEDGEMENTS: 'documentAcknowledgements',

  // Operations
  OPENING_CHECKLISTS: 'openingChecklists',
  CLOSING_CHECKLISTS: 'closingChecklists',
  DAILY_REPORTS: 'dailyReports',
  // HR_OPERATIONS.md §8.2 — Project Management. Tasks under a project are
  // ordinary Task Engine tasks referencing projectId, not a sub-collection.
  PROJECTS: 'projects',
  SHIFT_HANDOVERS: 'shiftHandovers',
  INCIDENT_REPORTS: 'incidentReports',
  WORK_ORDERS: 'workOrders',
  LOST_FOUND_ITEMS: 'lostFoundItems',
  PREVENTIVE_MAINTENANCE: 'preventiveMaintenance',
  EQUIPMENT: 'equipment',
  EQUIPMENT_INSPECTIONS: 'equipmentInspections',

  // Finance
  EXPENSE_REQUESTS: 'expenseRequests',
  EXPENSE_ITEMS: 'expenseItems',
  PETTY_CASH: 'pettyCash',
  BUDGET_PLANS: 'budgetPlans',
  BUDGET_REQUESTS: 'budgetRequests',
  PAYMENT_REQUESTS: 'paymentRequests',
  FINANCIAL_DOCUMENTS: 'financialDocuments',
  COST_CENTERS: 'costCenters',
  VENDORS: 'vendors',

  // Communications
  ANNOUNCEMENTS: 'announcements',
  ANNOUNCEMENT_READS: 'announcementReads',
  CHAT_CHANNELS: 'chatChannels',
  CHAT_MESSAGES: 'chatMessages',
  DIRECT_MESSAGES: 'directMessages',
  MENTIONS: 'mentions',
  ACTIVITY_FEED: 'activityFeed',
  COMMUNICATION_SETTINGS: 'communicationSettings',

  // Reports
  REPORTS: 'reports',
  REPORT_TEMPLATES: 'reportTemplates',
  REPORT_SNAPSHOTS: 'reportSnapshots',
  KPI_DEFINITIONS: 'kpiDefinitions',
  DASHBOARD_WIDGETS: 'dashboardWidgets',
  ANALYTICS_EVENTS: 'analyticsEvents',

  // Shared: Approval Engine (normalized — see note above)
  APPROVAL_WORKFLOWS: 'approvalWorkflows',
  APPROVAL_REQUESTS: 'approvalRequests',
  APPROVAL_STEPS: 'approvalSteps',
  APPROVAL_HISTORY: 'approvalHistory',
  APPROVAL_DELEGATIONS: 'approvalDelegations',

  // Shared: Task Engine
  TASKS: 'tasks',
  TASK_ASSIGNMENTS: 'taskAssignments',
  TASK_COMMENTS: 'taskComments',
  TASK_CHECKLISTS: 'taskChecklists',
  TASK_TEMPLATES: 'taskTemplates',
  TASK_HISTORY: 'taskHistory',

  // Shared: Notification Engine
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_PREFERENCES: 'notificationPreferences',
  NOTIFICATION_TEMPLATES: 'notificationTemplates',

  // Shared: Audit Log (write-only from Cloud Functions — client reads only)
  AUDIT_LOGS: 'auditLogs',

  // Shared: File Storage
  FILES: 'files',
  FILE_VERSIONS: 'fileVersions',
  FILE_SHARES: 'fileShares',

  // Shared: Calendar Service (HR_OPERATIONS.md §8.2)
  CALENDAR_EVENTS: 'calendarEvents',

  // Shared: Search
  SEARCH_INDEX: 'searchIndex',
  SEARCH_HISTORY: 'searchHistory',
  SAVED_SEARCHES: 'savedSearches',

  // Security
  CHECKPOINTS: 'checkpoints',
  PATROL_LOGS: 'patrolLogs',

  // Settings
  COMPANIES: 'companies',
  POSITIONS: 'positions',
  SYSTEM_SETTINGS: 'systemSettings',
  INTEGRATIONS: 'integrations',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
