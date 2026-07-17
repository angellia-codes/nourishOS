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