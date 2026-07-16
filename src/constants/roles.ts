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
  STOREKEEPER: 'storekeeper',
  MARKETING: 'marketing',
  CUSTOMER_SERVICE: 'customerService',
  STAFF: 'staff',
} as const