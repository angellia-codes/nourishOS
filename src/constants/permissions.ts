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
  CALENDAR: 'calendar',
  HR_INVENTORY: 'hrInventory',
  SHIFT_REPORTS: 'shiftReports',
  CHAT: 'chat',
  EXIT_INTERVIEWS: 'exitInterviews',
  PROJECTS: 'projects',
  CONTRACTS: 'contracts',
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
  // employee_communication.md §5.4 — a department head issues communications for
  // their own team without being able to edit employee records. Checked with
  // requireAnyPermission alongside EMPLOYEES_UPDATE, so hrManager and superAdmin
  // keep working with no change to their existing roles/{roleId} docs.
  EMPLOYEES_COMMUNICATE: permission(PERMISSION_MODULES.EMPLOYEES, 'communicate'),

  // exit-interview.md §4: same string gates both reading a record and
  // conducting/submitting one — HR Manager/Super Admin only, a harder wall
  // than the rest of the offboarding checklist (that stays on employees.update).
  EXIT_INTERVIEWS_VIEW: permission(PERMISSION_MODULES.EXIT_INTERVIEWS, 'view'),

  RECRUITMENT_READ: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.READ),
  RECRUITMENT_CREATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.CREATE),
  RECRUITMENT_UPDATE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.UPDATE),
  RECRUITMENT_APPROVE: permission(PERMISSION_MODULES.RECRUITMENT, ACTIONS.APPROVE),
  // employee-requisition.md §7's view_compensation, camelCase per this
  // codebase's convention (same as employees.readSensitive) rather than the
  // doc's literal spelling.
  RECRUITMENT_VIEW_COMPENSATION: permission(PERMISSION_MODULES.RECRUITMENT, 'viewCompensation'),
  // employment-application-form.md §3/§6: the F010 health, criminal-record and
  // previous-salary answers. The doc names it candidates.view_sensitive; kept
  // in the recruitment namespace next to viewCompensation rather than opening a
  // new module namespace for a single string.
  RECRUITMENT_VIEW_SENSITIVE: permission(PERMISSION_MODULES.RECRUITMENT, 'viewSensitive'),

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

  WORK_ORDERS_CREATE: permission(PERMISSION_MODULES.WORK_ORDERS, ACTIONS.CREATE),
  WORK_ORDERS_ASSIGN: permission(PERMISSION_MODULES.WORK_ORDERS, ACTIONS.ASSIGN),
  WORK_ORDERS_UPDATE: permission(PERMISSION_MODULES.WORK_ORDERS, ACTIONS.UPDATE),
  WORK_ORDERS_COMPLETE: permission(PERMISSION_MODULES.WORK_ORDERS, 'complete'),

  EXPENSE_REQUESTS_SUBMIT: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.SUBMIT),
  EXPENSE_REQUESTS_APPROVE: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.APPROVE),
  EXPENSE_REQUESTS_REJECT: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, ACTIONS.REJECT),
  // expense-request.md §7 — authorising the spend and moving the money are
  // separate actions; Finance only.
  EXPENSE_REQUESTS_PAY: permission(PERMISSION_MODULES.EXPENSE_REQUESTS, 'pay'),

  // Communications — Announcements (communications.md §19). Reads are gated by
  // firestore.rules against the resolved audience, not by a permission string,
  // so there is no announcements.read. BROADCAST covers the emergency category,
  // which §19 restricts to GM/Director/Super Admin.
  ANNOUNCEMENTS_CREATE: permission(PERMISSION_MODULES.ANNOUNCEMENTS, ACTIONS.CREATE),
  ANNOUNCEMENTS_PUBLISH: permission(PERMISSION_MODULES.ANNOUNCEMENTS, ACTIONS.PUBLISH),
  ANNOUNCEMENTS_BROADCAST: permission(PERMISSION_MODULES.ANNOUNCEMENTS, 'broadcast'),

  TASKS_ASSIGN: permission(PERMISSION_MODULES.TASKS, ACTIONS.ASSIGN),
  TASKS_COMPLETE: permission(PERMISSION_MODULES.TASKS, 'complete'),

  // Communications — Team Chat (communications.md §7/§19). SEND covers
  // sending in any channel you're in scope for (everyone, per §19's
  // Employee ✅ row); MANAGE_CHANNELS gates creating/archiving channels
  // themselves, restricted to Leader and above like Assign Task is.
  CHAT_SEND: permission(PERMISSION_MODULES.CHAT, 'send'),
  CHAT_MANAGE_CHANNELS: permission(PERMISSION_MODULES.CHAT, 'manageChannels'),

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

  // Shared: Calendar Service (HR_OPERATIONS.md §7.3). READ is the agenda
  // view; CREATE schedules an event; MANAGE covers editing and cancelling
  // anyone's event — §7.2 gives Full to superAdmin/HR/GM and read-only to
  // outlet leaders.
  CALENDAR_READ: permission(PERMISSION_MODULES.CALENDAR, ACTIONS.READ),
  CALENDAR_CREATE: permission(PERMISSION_MODULES.CALENDAR, ACTIONS.CREATE),
  CALENDAR_MANAGE: permission(PERMISSION_MODULES.CALENDAR, ACTIONS.MANAGE),

  // HR Inventory — uniforms & assets (stock ledger, not per-serial tracking).
  // MANAGE curates the item catalog; RECORD covers day-to-day movements
  // (receive/issue/transfer), which outlet leaders also get since they run
  // their own outlet's uniform stock — item-master edits stay HR's.
  HR_INVENTORY_MANAGE: permission(PERMISSION_MODULES.HR_INVENTORY, ACTIONS.MANAGE),
  HR_INVENTORY_RECORD: permission(PERMISSION_MODULES.HR_INVENTORY, 'record'),

  // Operations — Opening/Closing Shift Reports
  // (opening_closing_shift_report_template.md). Same three-string split as
  // Daily Updates above: READ covers the caller's own outlet (rules-scoped),
  // READ_ALL is the elevated cross-outlet view. One SUBMIT covers both report
  // types — same trust level, outlet leaders run both ends of the day.
  SHIFT_REPORTS_SUBMIT: permission(PERMISSION_MODULES.SHIFT_REPORTS, ACTIONS.SUBMIT),
  SHIFT_REPORTS_READ: permission(PERMISSION_MODULES.SHIFT_REPORTS, ACTIONS.READ),
  SHIFT_REPORTS_READ_ALL: permission(PERMISSION_MODULES.SHIFT_REPORTS, 'readAll'),

  // Operations — Project Management (HR_OPERATIONS.md §7.3 / §9.8). CREATE
  // raises a project, which needs GM approval (§9.10) before it opens; MANAGE
  // is moving it across the board, editing it, and closing it afterwards.
  PROJECTS_READ: permission(PERMISSION_MODULES.PROJECTS, ACTIONS.READ),
  PROJECTS_CREATE: permission(PERMISSION_MODULES.PROJECTS, ACTIONS.CREATE),
  PROJECTS_MANAGE: permission(PERMISSION_MODULES.PROJECTS, ACTIONS.MANAGE),

  // HR — the GM/Director digital-signature step on a new contract (§7.3 /
  // §9.14). The rest of the contract lifecycle stays on employees.update.
  CONTRACTS_SIGN: permission(PERMISSION_MODULES.CONTRACTS, 'sign'),
} as const

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
