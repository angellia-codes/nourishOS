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
  finance: 'Finance & Accounting',
  hr: 'Human Resources',
  marketing: 'Sales & Marketing',
  purchasing: 'Purchasing & Driver',
  kitchen: 'Kitchen',
  theBakeryKitchen: 'The Bakery Kitchen',
  bar: 'Bar',
  engineering: 'Engineering',
  security: 'Security',
  wholefood: 'Wholefood',
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
  restaurantSupervisor: { label: 'Restaurant Supervisor', rank: 5, department: 'fbService' },
  restaurantCaptain: { label: 'Restaurant Captain', rank: 6, department: 'fbService' },
  waiter: { label: 'Waiter / Waitress', rank: 7, department: 'fbService' },
  runner: { label: 'Runner', rank: 8, department: 'fbService' },

  // ------------------------------------ Finance, Accounting & Cost Control
  groupFinancialController: { label: 'Group Financial Controller', rank: 1, department: 'finance' },
  chiefAccounting: { label: 'Chief Accountant', rank: 2, department: 'finance' },
  costControl: { label: 'Cost Control', rank: 5, department: 'finance' },
  cashierSupervisor: { label: 'Cashier Supervisor', rank: 5, department: 'finance' },
  apGeneralCashier: { label: 'GC & AP', rank: 6, department: 'finance' },
  arIncomeAudit: { label: 'AR & IA', rank: 6, department: 'finance' },
  receivingStorekeeper: { label: 'Receiving & Storekeeper', rank: 7, department: 'finance' },
  accountingAdmin: { label: 'Accounting Admin', rank: 7, department: 'finance' },
  cashier: { label: 'Cashier', rank: 7, department: 'finance' },

  // ------------------------------------------------------- Human Resources
  groupHrManager: { label: 'Group HR Manager', rank: 1, department: 'hr' },
  juniorHrManager: { label: 'Jr. HR Manager', rank: 3, department: 'hr' },
  trainingDevelopmentSupervisor: { label: 'Training & Development Supervisor', rank: 5, department: 'hr' },
  hrGeneralAdmin: { label: 'HR & General Admin', rank: 6, department: 'hr' },

  // --------------------------------------------- Sales & Marketing
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
  groupExecutiveChef: { label: 'Group Executive Chef', rank: 2, department: 'kitchen' },
  headChef: { label: 'Head Chef', rank: 3, department: 'kitchen' },
  chiefBaker: { label: 'Chief Baker', rank: 3, department: 'theBakeryKitchen' },
  sousChef: { label: 'Sous Chef', rank: 4, department: 'kitchen' },
  sousChefBaker: { label: 'Sous Chef Baker', rank: 4, department: 'theBakeryKitchen' },
  chefDePartie: { label: 'Chef de Partie', rank: 5, department: 'kitchen' },
  chefDePartieBaker: { label: 'Chef de Partie Baker / Pastry', rank: 5, department: 'theBakeryKitchen' },
  demiChefDePartie: { label: 'Demi Chef', rank: 6, department: 'kitchen' },
  demiChefBaker: { label: 'Demi Chef Baker', rank: 6, department: 'theBakeryKitchen' },
  cook: { label: 'Cook', rank: 7, department: 'kitchen' },
  cookBaker: { label: 'Cook Baker / Pastry', rank: 7, department: 'theBakeryKitchen' },
  cookHelper: { label: 'Cook Helper', rank: 8, department: 'kitchen' },
  steward: { label: 'Steward', rank: 8, department: 'kitchen' },

  // --------------------------------------------------------- Bar
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
  engineerMep: { label: 'Engineering MEP', rank: 7, department: 'engineering' },
  publicAreaAttendant: { label: 'Public Area Attendant', rank: 8, department: 'engineering' },

  // -------------------------------------------------------------- Security
  securitySupervisor: { label: 'Security Supervisor', rank: 5, department: 'security' },
  securityGuard: { label: 'Security Guard', rank: 8, department: 'security' },

  // -------------------------------------------------------------- Wholefood
  wholefoodManager: { label: 'Wholefood Manager', rank: 3, department: 'wholefood' },
  wholefoodSupervisor: { label: 'Wholefood Supervisor', rank: 5, department: 'wholefood' },
  wholefoodCashier: { label: 'Wholefood Cashier', rank: 8, department: 'wholefood' },

  // ------------------------------------------------------- Cross-Department
  trainee: { label: 'Trainee', rank: 8, department: 'general' },
  dailyWorker: { label: 'Daily Worker (DW)', rank: 8, department: 'general' },
} as const satisfies Record<string, PositionEntry>

export type PositionId = keyof typeof POSITION_CATALOG

export const POSITION_LABELS = Object.fromEntries(
  Object.entries(POSITION_CATALOG).map(([id, p]) => [id, p.label]),
) as Record<PositionId, string>

/**
 * Scopes the position dropdown per app department (`src/constants/organization.ts`
 * — `admin_general`/`cashier`/`fb_service`/etc.), which is a different taxonomy
 * from POSITIONS.md §3's own department grouping above (`PositionDepartment`).
 * They don't line up 1:1 — e.g. "Wholefoods Cashier" sits under §3's Finance
 * heading but belongs to the app's `wholefood_retail` department — so this is
 * a hand-curated map, not a mechanical join on `POSITION_CATALOG[id].department`.
 *
 * Revised 2026-08-17 against an explicit per-department policy (12 numbered
 * corrections), superseding the first pass's "every catalog entry under its
 * POSITIONS.md heading, trainee/dailyWorker everywhere" default:
 *  - `trainee`/`dailyWorker` are no longer appended to every department —
 *    they're listed explicitly, and only, under `fb_service`/`bar`/`kitchen`
 *    ("The Bakery Kitchen" is an outlet, not a department — it staffs
 *    `kitchen`, per `organization.ts`'s `OUTLET_DEPARTMENTS`).
 *  - `central_kitchen`, `security`, `wholefood_retail` were untouched by the
 *    policy and keep their original lists (minus the no-longer-automatic
 *    trainee/dailyWorker).
 *  - `housekeeping` is deliberately **empty** — POSITIONS.md has no
 *    Housekeeping section and the policy didn't add trainee/dailyWorker back
 *    for it, so no position is currently selectable for that department
 *    (confirmed; not an oversight).
 *  - Several catalog ids (e.g. `ceo`, `groupOperationalManager`, `runner`,
 *    `groupBarManager`, `barBack`, `assistantBarManager`,
 *    `directorOfSalesMarketing`, `socialMediaSpecialist`, `engineerCivil`,
 *    `groupHrManager`, `trainingDevelopmentSupervisor`,
 *    `groupFinancialController`, `costControl`, `arIncomeAudit`) are no
 *    longer selectable from *any* department after this revision — left in
 *    `POSITION_CATALOG`/`POSITION_LABELS` rather than deleted, since a legacy
 *    employee record may still carry one and needs it to keep resolving to a
 *    label.
 *
 * Revised again the same day: three baking titles are further restricted to
 * one specific *outlet* within the `kitchen` department, not the whole
 * department — `kitchen` is staffed by `the_bakery_kitchen` and by every
 * standard restaurant outlet (`nourish_ungasan`/`nourish_uluwatu`/
 * `nourish_berawa`, per `OUTLET_DEPARTMENTS`), and Chief Baker/Chef de Partie
 * Baker/Cook-Baker only make sense at the bakery. `positionsFor` below
 * intersects the department list with `OUTLET_ONLY_POSITION_IDS` for exactly
 * these — a department-only lookup can't express "only at this outlet within
 * the department," so outletId is now a required second input alongside
 * departmentId wherever positions are offered or validated.
 */
export const DEPARTMENT_POSITION_IDS: Record<string, readonly PositionId[]> = {
  admin_general: ['director', 'groupGeneralManager'],
  cashier: ['cashierSupervisor', 'cashier'],
  fb_service: [
    'restaurantManager',
    'restaurantSupervisor',
    'restaurantCaptain',
    'waiter',
    'restaurantMaintenanceManager',
    'trainee',
    'dailyWorker',
  ],
  bar: ['barManager', 'barSupervisor', 'barCaptain', 'barista', 'barBack', 'trainee', 'dailyWorker'],
  kitchen: [
    // Both ladders live here because `the_bakery_kitchen` staffs `kitchen`
    // (OUTLET_DEPARTMENTS) — OUTLET_ONLY_POSITION_IDS is what splits them.
    'headChef',
    'sousChef',
    'chefDePartie',
    'demiChefDePartie',
    'cook',
    'cookHelper',
    'steward',
    'chiefBaker',
    'sousChefBaker',
    'chefDePartieBaker',
    'demiChefBaker',
    'cookBaker',
    'trainee',
    'dailyWorker',
  ],
  central_kitchen: [
    'headChef',
    'sousChef',
    'demiChefDePartie',
    'cookHelper',
    'steward',
    'trainee',
    'dailyWorker',
  ],
  sales_marketing: ['creativeMarketingManager', 'juniorGraphicDesigner'],
  security: ['securitySupervisor', 'securityGuard'],
  engineering_pomec: ['restaurantMaintenanceManager', 'engineerMep', 'publicAreaAttendant'],
  human_resources: ['juniorHrManager', 'hrGeneralAdmin'],
  finance_accounting: [
    'chiefAccounting',
    'apGeneralCashier',
    'receivingStorekeeper',
    'accountingAdmin',
    'purchasingManager',
    'purchasingSupervisor',
  ],
  driver: ['driverLeader', 'driver'],
  // Deliberately empty — see the block comment above.
  housekeeping: [],
  wholefood_retail: ['wholefoodManager', 'wholefoodSupervisor', 'wholefoodCashier'],
}

/** `kitchen`'s three non-bakery restaurant outlets — the mirror image of `the_bakery_kitchen`. */
const STANDARD_RESTAURANT_OUTLET_IDS = ['nourish_ungasan', 'nourish_uluwatu', 'nourish_berawa']

/**
 * Positions restricted to specific outlets, on top of their department
 * scoping — see the block comment above. `kitchen` splits cleanly along the
 * bakery/restaurant line: the baking titles only at `the_bakery_kitchen`,
 * the line-cook titles everywhere else in the department. `steward`/
 * `trainee`/`dailyWorker` are deliberately absent here — common to both.
 */
export const OUTLET_ONLY_POSITION_IDS: Partial<Record<PositionId, readonly string[]>> = {
  chiefBaker: ['the_bakery_kitchen'],
  sousChefBaker: ['the_bakery_kitchen'],
  chefDePartieBaker: ['the_bakery_kitchen'],
  demiChefBaker: ['the_bakery_kitchen'],
  cookBaker: ['the_bakery_kitchen'],
  headChef: STANDARD_RESTAURANT_OUTLET_IDS,
  sousChef: STANDARD_RESTAURANT_OUTLET_IDS,
  chefDePartie: STANDARD_RESTAURANT_OUTLET_IDS,
  demiChefDePartie: STANDARD_RESTAURANT_OUTLET_IDS,
  cook: STANDARD_RESTAURANT_OUTLET_IDS,
  cookHelper: STANDARD_RESTAURANT_OUTLET_IDS,
}

/** The options a department's position dropdown offers at a given outlet. */
export function positionsFor(outletId: string, departmentId: string): PositionId[] {
  return (DEPARTMENT_POSITION_IDS[departmentId] ?? []).filter((id) => {
    const restriction = OUTLET_ONLY_POSITION_IDS[id]
    return !restriction || restriction.includes(outletId)
  })
}
