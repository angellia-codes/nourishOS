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
  CONTRACTS: 'contracts',
  PERFORMANCES: 'performances',
  DISCIPLINARY_ACTIONS: 'disciplinaryActions',
  TRAININGS: 'trainings',
  EMPLOYEE_ASSETS: 'employeeAssets',
  EMPLOYEE_ACTIVITIES: 'employeeActivities',

  // Documents
  SOPS: 'sops',
  DOCUMENTS: 'documents',
  DOCUMENT_VERSIONS: 'documentVersions',
  DOCUMENT_CATEGORIES: 'documentCategories',
  DOCUMENT_TAGS: 'documentTags',
  DOCUMENT_APPROVALS: 'documentApprovals',
  TEMPLATES: 'templates',
  TRAINING_MODULES: 'trainingModules',
  KNOWLEDGE_BASE: 'knowledgeBase',
  DOCUMENT_ACKNOWLEDGEMENTS: 'documentAcknowledgements',

  // Operations
  OPENING_CHECKLISTS: 'openingChecklists',
  CLOSING_CHECKLISTS: 'closingChecklists',
  DAILY_REPORTS: 'dailyReports',
  SHIFT_HANDOVERS: 'shiftHandovers',
  INCIDENT_REPORTS: 'incidentReports',
  WORK_ORDERS: 'workOrders',
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

  // Purchasing
  PURCHASE_REQUESTS: 'purchaseRequests',
  PURCHASE_ORDERS: 'purchaseOrders',
  RFQS: 'rfqs',
  SUPPLIERS: 'suppliers',
  GRNS: 'grns',
  SUPPLIER_RATINGS: 'supplierRatings',

  // Inventory
  INVENTORY_ITEMS: 'inventoryItems',
  STOCK_LEVELS: 'stockLevels',
  STOCK_MOVEMENTS: 'stockMovements',
  STOCK_TRANSFERS: 'stockTransfers',
  STOCK_ADJUSTMENTS: 'stockAdjustments',
  STOCK_OPNAME: 'stockOpname',
  WASTE_LOGS: 'wasteLogs',
  INVENTORY_VALUATION: 'inventoryValuation',

  // CRM
  CUSTOMERS: 'customers',
  CUSTOMER_INTERACTIONS: 'customerInteractions',
  CUSTOMER_FEEDBACK: 'customerFeedback',
  CUSTOMER_SEGMENTS: 'customerSegments',
  CUSTOMER_NOTES: 'customerNotes',

  // Communications
  ANNOUNCEMENTS: 'announcements',
  ANNOUNCEMENT_READS: 'announcementReads',
  CHAT_CHANNELS: 'chatChannels',
  CHAT_MESSAGES: 'chatMessages',
  DIRECT_MESSAGES: 'directMessages',
  MENTIONS: 'mentions',

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

  // Shared: Search
  SEARCH_INDEX: 'searchIndex',
  SEARCH_HISTORY: 'searchHistory',
  SAVED_SEARCHES: 'savedSearches',

  // Settings
  COMPANIES: 'companies',
  POSITIONS: 'positions',
  SYSTEM_SETTINGS: 'systemSettings',
  INTEGRATIONS: 'integrations',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
