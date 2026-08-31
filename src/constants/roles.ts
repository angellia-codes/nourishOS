export const ROLES = {
  SUPER_ADMIN: 'superAdmin',
  DIRECTOR: 'director',
  GENERAL_MANAGER: 'generalManager',
  HR_MANAGER: 'hrManager',
  FINANCE: 'finance',
  PURCHASING: 'purchasing',
  HEAD_CHEF: 'headChef',
  BAR_MANAGER: 'barManager',
  RESTAURANT_SUPERVISOR: 'restaurantSupervisor',
  /** Added for HR & Operations PRD §7.1 — Bakery outlet did not have a leader role. */
  CHIEF_BAKER: 'chiefBaker',
  /** Added for HR & Operations PRD §7.1 — Wholefood outlet did not have a leader role. */
  WHOLEFOOD_LEADER: 'wholefoodLeader',
  SECURITY: 'security',
  ENGINEERING: 'engineering',
  /** POSITIONS.md §3 Level III — F&B Service leadership at a restaurant outlet, the outlet-wide successor role at the three standard restaurant outlets. */
  RESTAURANT_MANAGER: 'restaurantManager',
  /** POSITIONS.md §3 Level VIII — retail cashier at a Wholefood outlet. */
  WHOLEFOOD_CASHIER: 'wholefoodCashier',
  MARKETING: 'marketing',
  /** Org role ladder pass 2026-08-29 — Sales & Marketing rank & file. */
  JUNIOR_GRAPHIC_DESIGNER: 'juniorGraphicDesigner',
  /** POSITIONS.md §3 Level III — Engineering/POMEC department head, above `engineering` (the MEP technician). */
  RESTAURANT_MAINTENANCE_MANAGER: 'restaurantMaintenanceManager',
  /** POSITIONS.md §3 Level VI — HR clerical support, below `hrManager`. */
  HR_GENERAL_ADMIN: 'hrGeneralAdmin',
  PURCHASING_SUPERVISOR: 'purchasingSupervisor',
  /** General Cashier & Accounts Payable. */
  GENERAL_CASHIER_AP: 'generalCashierAp',
  /** Accounts Receivable & Income Audit. */
  AR_INCOME_AUDIT: 'arIncomeAudit',
  RECEIVING_STOREKEEPER: 'receivingStorekeeper',
  DRIVER_LEADER: 'driverLeader',
  DRIVER: 'driver',
  CASHIER_SUPERVISOR: 'cashierSupervisor',
  CASHIER: 'cashier',
  RESTAURANT_CAPTAIN: 'restaurantCaptain',
  WAITER: 'waiter',
  BAR_SUPERVISOR: 'barSupervisor',
  BAR_CAPTAIN: 'barCaptain',
  BARISTA: 'barista',
  SOUS_CHEF: 'sousChef',
  CHEF_DE_PARTIE: 'chefDePartie',
  COOK: 'cook',
  COOK_HELPER: 'cookHelper',
  STEWARD: 'steward',
  /** Central Kitchen's senior line role — the Production Hub has no Head Chef of its own. */
  DEMI_CHEF: 'demiChef',
  SECURITY_GUARD: 'securityGuard',
  CHEF_DE_PARTIE_BAKER: 'chefDePartieBaker',
  COOK_BAKER: 'cookBaker',
  WHOLEFOOD_SUPERVISOR: 'wholefoodSupervisor',
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
  ROLES.HR_GENERAL_ADMIN,
  ROLES.SUPER_ADMIN,
]

/** Who may be picked as a recruitment interviewer (leader/manager roles) — mirrored in functions/src/recruitment/helpers.ts. */
export const INTERVIEWER_ROLES: readonly Role[] = [
  ROLES.HEAD_CHEF,
  ROLES.BAR_MANAGER,
  ROLES.RESTAURANT_SUPERVISOR,
  ROLES.CHIEF_BAKER,
  ROLES.WHOLEFOOD_LEADER,
  ROLES.RESTAURANT_MANAGER,
  ROLES.RESTAURANT_MAINTENANCE_MANAGER,
  ROLES.HR_MANAGER,
  ROLES.GENERAL_MANAGER,
  ROLES.DIRECTOR,
  ROLES.SUPER_ADMIN,
]