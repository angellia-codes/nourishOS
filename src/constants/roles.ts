export const ROLES = {
  SUPER_ADMIN: 'superAdmin',
  DIRECTOR: 'director',
  GENERAL_MANAGER: 'generalManager',
  HR_MANAGER: 'hrManager',
  FINANCE: 'finance',
  PURCHASING: 'purchasing',
  KITCHEN_LEADER: 'kitchenLeader',
  BAR_LEADER: 'barLeader',
  FLOOR_LEADER: 'floorLeader',
  /** Added for HR & Operations PRD §7.1 — Bakery outlet did not have a leader role. */
  BAKERY_LEADER: 'bakeryLeader',
  /** Added for HR & Operations PRD §7.1 — Wholefood outlet did not have a leader role. */
  WHOLEFOOD_LEADER: 'wholefoodLeader',
  SECURITY: 'security',
  ENGINEERING: 'engineering',
  OUTLET_MANAGER: 'outletManager',
  /** POSITIONS.md §3 Level III — F&B Service leadership at a restaurant outlet, replacing outletManager on the registration form. */
  RESTAURANT_MANAGER: 'restaurantManager',
  /** POSITIONS.md §3 Level VIII — retail cashier at a Wholefood outlet. */
  WHOLEFOOD_CASHIER: 'wholefoodCashier',
  MARKETING: 'marketing',
  STAFF: 'staff',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Roles with cross-outlet visibility per RBAC.md §7. Used by outlet-scoping logic. */
export const CROSS_OUTLET_ROLES: readonly Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.DIRECTOR,
  ROLES.GENERAL_MANAGER,
]

/** HR module allow-list — mirrors routes.tsx's RoleRoute gate on /hr. Single source of truth so links into /hr can check access without drifting from the gate itself. */
export const HR_REPORT_ROLES: readonly Role[] = [
  ROLES.GENERAL_MANAGER,
  ROLES.DIRECTOR,
  ROLES.HR_MANAGER,
  ROLES.SUPER_ADMIN,
]

/** Who may be picked as a recruitment interviewer (leader/manager roles) — mirrored in functions/src/recruitment/helpers.ts. */
export const INTERVIEWER_ROLES: readonly Role[] = [
  ROLES.KITCHEN_LEADER,
  ROLES.BAR_LEADER,
  ROLES.FLOOR_LEADER,
  ROLES.BAKERY_LEADER,
  ROLES.WHOLEFOOD_LEADER,
  ROLES.OUTLET_MANAGER,
  ROLES.RESTAURANT_MANAGER,
  ROLES.HR_MANAGER,
  ROLES.GENERAL_MANAGER,
  ROLES.DIRECTOR,
  ROLES.SUPER_ADMIN,
]