/**
 * Canonical roles.
 *
 * Source: RBAC.md §4. Extended with roles used in module-level permission
 * matrices (CRM.md, PURCHASING.md, INVENTORY.md) that aren't in RBAC.md's
 * core list yet. Marked below so the gap stays visible instead of being
 * silently merged away — recommend folding these into RBAC.md §4/§14.
 */
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
  SECURITY: 'security',
  ENGINEERING: 'engineering',
  /** Used in CRM.md, PURCHASING.md, INVENTORY.md matrices — not yet in RBAC.md §4. */
  OUTLET_MANAGER: 'outletManager',
  /** INVENTORY.md only. */
  STOREKEEPER: 'storekeeper',
  /** CRM.md only. */
  MARKETING: 'marketing',
  /** CRM.md only. */
  CUSTOMER_SERVICE: 'customerService',
  /** Generic frontline/employee baseline referenced across module docs as "Staff"/"Employee". */
  STAFF: 'staff',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Roles with cross-outlet visibility per RBAC.md §7. Used by outlet-scoping logic. */
export const CROSS_OUTLET_ROLES: readonly Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.DIRECTOR,
  ROLES.GENERAL_MANAGER,
]
