/**
 * The org-wide Positions catalog, transcribed from POSITIONS.md §3 (departmental
 * mapping) and §4 (rank matrix).
 *
 * Positions are distinct from RBAC Roles (settings.md §7: "Each position may
 * have a default role"). Waiter and Barista might both carry the "staff"
 * RBAC role but need entirely different appraisal criteria — appraisal
 * templates key off positionId, not roleId. `rank` is the Level 0–VIII class
 * that drives approval authority (POSITIONS.md §2).
 *
 * Trainee and Daily Worker appear under several departments in §3; §4 lists
 * each once, so they live here once under `general`.
 */

/** POSITIONS.md §2 — Level 0 is the top of the org, Level VIII the bottom. */
export const POSITION_RANK_LABELS: Record<number, string> = {
  0: 'Level 0 — Executive Board',
  1: 'Level I — Executive Committee / Division Head',
  2: 'Level II — Department Head / Senior Manager',
  3: 'Level III — Assistant Department / Manager',
  4: 'Level IV — Assistant Manager',
  5: 'Level V — Supervisor I / Senior Supervisor',
  6: 'Level VI — Supervisor II / Junior Supervisor',
  7: 'Level VII — Rank & File I / Senior Staff',
  8: 'Level VIII — Rank & File II / Junior Staff / Trainee & DW',
}

export const POSITION_DEPARTMENT_LABELS = {
  executive: 'Executive Board',
  fbService: 'F&B Service',
  finance: 'Finance, Accounting & Cost Control',
  hr: 'Human Resources',
  marketing: 'Sales, Marketing & Creative',
  purchasing: 'Purchasing & Logistics',
  culinary: 'Culinary & Bakery',
  bar: 'Bar & Beverage',
  engineering: 'Engineering & Maintenance',
  security: 'Security',
  general: 'Cross-Department',
} as const

export type PositionDepartment = keyof typeof POSITION_DEPARTMENT_LABELS

interface PositionEntry {
  label: string
  rank: number
  department: PositionDepartment
}

/** Ordered by department, then rank — dropdowns render in this order. */
export const POSITION_CATALOG = {
  // ------------------------------------------------------- Executive Board
  ceo: { label: 'Chief Executive Officer (CEO)', rank: 0, department: 'executive' },
  director: { label: 'Director', rank: 0, department: 'executive' },
  groupGeneralManager: { label: 'Group General Manager', rank: 0, department: 'executive' },

  // ----------------------------------------------------------- F&B Service
  groupOperationalManager: { label: 'Group Operational Manager', rank: 1, department: 'fbService' },
  operationalManager: { label: 'Operational Manager', rank: 2, department: 'fbService' },
  restaurantManager: { label: 'Restaurant Manager', rank: 3, department: 'fbService' },
  wholefoodsManager: { label: 'Wholefoods Manager', rank: 3, department: 'fbService' },
  restaurantSupervisor: { label: 'Restaurant Supervisor', rank: 5, department: 'fbService' },
  wholefoodsSupervisor: { label: 'Wholefoods Supervisor', rank: 5, department: 'fbService' },
  restaurantCaptain: { label: 'Restaurant Captain', rank: 6, department: 'fbService' },
  waiter: { label: 'Waiter / Waitress', rank: 7, department: 'fbService' },
  runner: { label: 'Runner', rank: 8, department: 'fbService' },

  // ------------------------------------ Finance, Accounting & Cost Control
  groupFinancialController: { label: 'Group Financial Controller', rank: 1, department: 'finance' },
  chiefAccounting: { label: 'Chief Accounting', rank: 2, department: 'finance' },
  costControl: { label: 'Cost Control', rank: 5, department: 'finance' },
  cashierSupervisor: { label: 'Cashier Supervisor', rank: 5, department: 'finance' },
  apGeneralCashier: { label: 'AP & GC (Accounts Payable & General Cashier)', rank: 6, department: 'finance' },
  arIncomeAudit: { label: 'AR & IA (Accounts Receivable & Income Audit)', rank: 6, department: 'finance' },
  receivingStorekeeper: { label: 'Receiving & Storekeeper', rank: 7, department: 'finance' },
  accountingAdmin: { label: 'Accounting Admin', rank: 7, department: 'finance' },
  cashier: { label: 'Cashier', rank: 7, department: 'finance' },
  wholefoodsCashier: { label: 'Wholefoods Cashier', rank: 8, department: 'finance' },

  // ------------------------------------------------------- Human Resources
  groupHrManager: { label: 'Group HR Manager', rank: 1, department: 'hr' },
  juniorHrManager: { label: 'Junior HR Manager', rank: 3, department: 'hr' },
  trainingDevelopmentSupervisor: { label: 'Training & Development Supervisor', rank: 5, department: 'hr' },
  hrGeneralAdmin: { label: 'HR & General Admin', rank: 6, department: 'hr' },

  // --------------------------------------------- Sales, Marketing & Creative
  directorOfSalesMarketing: { label: 'Director of Sales & Marketing', rank: 1, department: 'marketing' },
  creativeMarketingManager: { label: 'Creative & Marketing Manager', rank: 2, department: 'marketing' },
  socialMediaSpecialist: { label: 'Social Media Specialist', rank: 6, department: 'marketing' },
  juniorGraphicDesigner: { label: 'Jr. Graphic Designer', rank: 6, department: 'marketing' },

  // ------------------------------------------------- Purchasing & Logistics
  purchasingManager: { label: 'Purchasing Manager', rank: 2, department: 'purchasing' },
  purchasingSupervisor: { label: 'Purchasing Supervisor', rank: 5, department: 'purchasing' },
  driverLeader: { label: 'Driver Leader', rank: 6, department: 'purchasing' },
  driver: { label: 'Driver', rank: 7, department: 'purchasing' },

  // ------------------------------------------------------ Culinary & Bakery
  groupExecutiveChef: { label: 'Group Executive Chef', rank: 2, department: 'culinary' },
  headChef: { label: 'Head Chef', rank: 3, department: 'culinary' },
  chiefBaker: { label: 'Chief Baker', rank: 3, department: 'culinary' },
  sousChef: { label: 'Sous Chef', rank: 4, department: 'culinary' },
  sousChefBaker: { label: 'Sous Chef Baker', rank: 4, department: 'culinary' },
  chefDePartie: { label: 'Chef de Partie', rank: 5, department: 'culinary' },
  chefDePartieBaker: { label: 'Chef de Partie Baker / Pastry', rank: 5, department: 'culinary' },
  demiChefDePartie: { label: 'Demi Chef de Partie', rank: 6, department: 'culinary' },
  demiChefBaker: { label: 'Demi Chef Baker', rank: 6, department: 'culinary' },
  cook: { label: 'Cook', rank: 7, department: 'culinary' },
  cookBaker: { label: 'Cook / Baker', rank: 7, department: 'culinary' },
  cookHelper: { label: 'Cook Helper', rank: 8, department: 'culinary' },
  steward: { label: 'Steward', rank: 8, department: 'culinary' },

  // --------------------------------------------------------- Bar & Beverage
  groupBarManager: { label: 'Group Bar Manager', rank: 2, department: 'bar' },
  barManager: { label: 'Bar Manager', rank: 3, department: 'bar' },
  assistantBarManager: { label: 'Assistant Bar Manager', rank: 4, department: 'bar' },
  barSupervisor: { label: 'Bar Supervisor', rank: 5, department: 'bar' },
  barCaptain: { label: 'Bar Captain', rank: 6, department: 'bar' },
  barista: { label: 'Barista / Bartender', rank: 7, department: 'bar' },
  barBack: { label: 'Bar Back', rank: 8, department: 'bar' },

  // ------------------------------------------------ Engineering & Maintenance
  restaurantMaintenanceManager: {
    label: 'Restaurant & Maintenance Manager',
    rank: 3,
    department: 'engineering',
  },
  engineerCivil: { label: 'Engineer (Civil)', rank: 7, department: 'engineering' },
  engineerMep: { label: 'Engineer (MEP)', rank: 7, department: 'engineering' },
  publicAreaAttendant: { label: 'Public Area Attendant', rank: 8, department: 'engineering' },

  // -------------------------------------------------------------- Security
  securitySupervisor: { label: 'Security Supervisor', rank: 5, department: 'security' },
  securityGuard: { label: 'Security Guard', rank: 8, department: 'security' },

  // ------------------------------------------------------- Cross-Department
  trainee: { label: 'Trainee', rank: 8, department: 'general' },
  dailyWorker: { label: 'Daily Worker (DW)', rank: 8, department: 'general' },
} as const satisfies Record<string, PositionEntry>

export type PositionId = keyof typeof POSITION_CATALOG

export const POSITION_LABELS = Object.fromEntries(
  Object.entries(POSITION_CATALOG).map(([id, p]) => [id, p.label]),
) as Record<PositionId, string>
