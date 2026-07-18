/** Standard permission actions. Source: RBAC.md §3. */
export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  SUBMIT: 'submit',
  PUBLISH: 'publish',
  ASSIGN: 'assign',
  EXPORT: 'export',
  MANAGE: 'manage',
} as const

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS]

/** Module namespaces used in "module.action" permission strings. Source: RBAC.md §16. */
export const PERMISSION_MODULES = {
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  RECRUITMENT: 'recruitment',
  TRAINING: 'training',
  APPRAISALS: 'appraisals',
  DOCUMENTS: 'documents',
  SOPS: 'sops',
  REPORTS: 'reports',
  WORK_ORDERS: 'workOrders',
  EXPENSE_REQUESTS: 'expenseRequests',
  ANNOUNCEMENTS: 'announcements',
  TASKS: 'tasks',
  SETTINGS: 'settings',
  USERS: 'users',
  ROLES: 'roles',
  SECURITY: 'security',
  LOST_FOUND: 'lostFound',
  INCIDENTS: 'incidents',
  DAILY_UPDATES: 'dailyUpdates',
} as const

export type PermissionModule = (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES]

/** Builds a "module.action" permission string. Source: RBAC.md §2. */
export function permission(moduleName: string, action: Action | string): string {
  return `${moduleName}.${action}`
}

/**
 * Explicit permission strings enumerated in RBAC.md §16 — kept literal
 * (rather than only generated) so they're greppable and match the doc
 * verbatim. Extend this list as new modules formalize their permissions.
 */
export const PERMISSIONS = {
  DASHBOARD_READ: permission(PERMISSION_MODULES.DASHBOARD, ACTIONS.READ),

  EMPLOYEES_READ: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.READ),
  EMPLOYEES_CREATE: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.CREATE),
  EMPLOYEES_UPDATE: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.UPDATE),
  EMPLOYEES_DELETE: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.DELETE),
  EMPLOYEES_EXPORT: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.EXPORT),
  EMPLOYEES_READ_SENSITIVE: permission(PERMISSION_MODULES.EMPLOYEES, 'readSensitive'),

  RECRUITMENT_READ: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.READ),
  RECRUITMENT_CREATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.CREATE),
  RECRUITMENT_UPDATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.UPDATE),
  RECRUITMENT_APPROVE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.APPROVE),

  // Performance Appraisal — extends HR.md §10. All review types route through
  // GM approval (confirmed decision, not a doc default); insight generation
  // is its own permission since it's a distinct, deliberately on-demand action.
  APPRAISALS_READ: permission(PERMISSION_MODULES.APPRAISALS, ACTIONS.READ),
  APPRAISALS_CREATE: permission(PERMISSION_MODULES.APPRAISALS, ACTIONS.CREATE),
  APPRAISALS_SUBMIT: permission(PERMISSION_MODULES.APPRAISALS, ACTIONS.SUBMIT),
  APPRAISALS_APPROVE: permission(PERMISSION_MODULES.APPRAISALS, ACTIONS.APPROVE),
  APPRAISALS_REJECT: permission(PERMISSION_MODULES.APPRAISALS, ACTIONS.REJECT),
  APPRAISALS_GENERATE_INSIGHTS: permission(PERMISSION_MODULES.APPRAISALS, 'generateInsights'),
  APPRAISALS_MANAGE_TEMPLATES: permission(PERMISSION_MODULES.APPRAISALS, 'manageTemplates'),

  TRAINING_READ: permission(PERMISSION_MODULES.TRAINING, ACTIONS.READ),
  TRAINING_ASSIGN: permission(PERMISSION_MODULES.TRAINING, ACTIONS.ASSIGN),

  DOCUMENTS_READ: permission(PERMISSION_MODULES.DOCUMENTS, ACTIONS.READ),
  DOCUMENTS_PUBLISH: permission(PERMISSION_MODULES.DOCUMENTS, ACTIONS.PUBLISH),

  SOPS_READ: permission(PERMISSION_MODULES.SOPS, ACTIONS.READ),
  SOPS_PUBLISH: permission(PERMISSION_MODULES.SOPS, ACTIONS.PUBLISH),

  REPORTS_READ: permission(PERMISSION_MODULES.REPORTS, ACTIONS.READ),
  REPORTS_CREATE: permission(PERMISSION_MODULES.REPORTS, ACTIONS.CREATE),

  WORK_ORDERS_ASSIGN: permission(PERMISSION_MODULES.WORK_ORDERS, ACTIONS.ASSIGN),
  WORK_ORDERS_UPDATE: permission(PERMISSION_MODULES.WORK_ORDERS, ACTIONS.UPDATE),
  WORK_ORDERS_COMPLETE: permission(PERMISSION_MODULES.WORK_ORDERS, 'complete'),

  EXPENSE_REQUESTS_SUBMIT: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.SUBMIT),
  EXPENSE_REQUESTS_APPROVE: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.APPROVE),
  EXPENSE_REQUESTS_REJECT: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.REJECT),
  // expense-request.md §7 — disbursing money is a distinct action from
  // approving it (approval authorizes; pay moves cash), so it gets its own
  // Finance-only permission rather than riding on APPROVE.
  EXPENSE_REQUESTS_PAY: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, 'pay'),

  ANNOUNCEMENTS_PUBLISH: permission(PERMISSION_MODULES.ANNOUNCEMENTS, ACTIONS.PUBLISH),

  TASKS_ASSIGN: permission(PERMISSION_MODULES.TASKS, ACTIONS.ASSIGN),
  TASKS_COMPLETE: permission(PERMISSION_MODULES.TASKS, 'complete'),

  SETTINGS_MANAGE: permission(PERMISSION_MODULES.SETTINGS, ACTIONS.MANAGE),
  USERS_MANAGE: permission(PERMISSION_MODULES.USERS, ACTIONS.MANAGE),
  ROLES_MANAGE: permission(PERMISSION_MODULES.ROLES, ACTIONS.MANAGE),

  // Security — patrol checkpoints. Any active guard can log a patrol;
  // registering/editing checkpoints themselves is a supervisor action.
  PATROLS_CREATE: permission(PERMISSION_MODULES.SECURITY, ACTIONS.CREATE),
  PATROLS_READ: permission(PERMISSION_MODULES.SECURITY, ACTIONS.READ),
  CHECKPOINTS_MANAGE: permission(PERMISSION_MODULES.SECURITY, 'manageCheckpoints'),

  // Operations — Lost & Found (lost-and-found-report.md §7). No separate
  // "view_all" string — cross-outlet visibility is a rules-layer role check
  // (isElevated()), same as checkpoints doesn't split it at the permission
  // string level either.
  LOST_FOUND_READ: permission(PERMISSION_MODULES.LOST_FOUND, ACTIONS.READ),
  LOST_FOUND_CREATE: permission(PERMISSION_MODULES.LOST_FOUND, ACTIONS.CREATE),
  LOST_FOUND_MANAGE: permission(PERMISSION_MODULES.LOST_FOUND, ACTIONS.MANAGE),

  // Operations — Incident Reports (incident-report.md §8). READ_SENSITIVE
  // gates the UI's display of workplace-injury narrative fields; the rules
  // layer already restricts the whole document more coarsely (see
  // firestore.rules) so this is a UX-layer refinement, not the only guard.
  INCIDENTS_READ: permission(PERMISSION_MODULES.INCIDENTS, ACTIONS.READ),
  INCIDENTS_CREATE: permission(PERMISSION_MODULES.INCIDENTS, ACTIONS.CREATE),
  INCIDENTS_MANAGE: permission(PERMISSION_MODULES.INCIDENTS, ACTIONS.MANAGE),
  INCIDENTS_READ_SENSITIVE: permission(PERMISSION_MODULES.INCIDENTS, 'readSensitive'),

  // Operations — Daily Updates (daily-updates.md §7). READ covers own
  // outlet (rules-scoped); READ_ALL is the elevated cross-outlet view.
  DAILY_UPDATES_SUBMIT: permission(PERMISSION_MODULES.DAILY_UPDATES, ACTIONS.SUBMIT),
  DAILY_UPDATES_READ: permission(PERMISSION_MODULES.DAILY_UPDATES, ACTIONS.READ),
  DAILY_UPDATES_READ_ALL: permission(PERMISSION_MODULES.DAILY_UPDATES, 'readAll'),
} as const

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
