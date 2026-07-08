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

  RECRUITMENT_READ: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.READ),
  RECRUITMENT_CREATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.CREATE),
  RECRUITMENT_UPDATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.UPDATE),
  RECRUITMENT_APPROVE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.APPROVE),

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

  ANNOUNCEMENTS_PUBLISH: permission(PERMISSION_MODULES.ANNOUNCEMENTS, ACTIONS.PUBLISH),

  TASKS_ASSIGN: permission(PERMISSION_MODULES.TASKS, ACTIONS.ASSIGN),
  TASKS_COMPLETE: permission(PERMISSION_MODULES.TASKS, 'complete'),

  SETTINGS_MANAGE: permission(PERMISSION_MODULES.SETTINGS, ACTIONS.MANAGE),
  USERS_MANAGE: permission(PERMISSION_MODULES.USERS, ACTIONS.MANAGE),
  ROLES_MANAGE: permission(PERMISSION_MODULES.ROLES, ACTIONS.MANAGE),
} as const

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
