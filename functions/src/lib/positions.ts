/**
 * Known duplication (see collections.ts) — mirrors src/constants/positions.ts
 * (POSITIONS.md §3/§4) so createEmployee/updateEmployee can validate a
 * position against the org-wide catalog without trusting the client. Pairs
 * with organization.ts, which this reuses departmentId keys from. Keep both
 * copies in step.
 */

/**
 * Rank (0-8, POSITIONS.md §2) per PositionId — mirrors the `rank` field on
 * each src/constants/positions.ts POSITION_CATALOG entry. Added for
 * Positions Master's seedPositions (functions/src/hr/positions/), which
 * needs a numeric-to-roman tier mapping server-side and previously had none
 * of the catalog's rank data available to it. Keep in step with the client
 * copy same as everything else in this file.
 */
export const POSITION_RANKS: Record<string, number> = {
  ceo: 0,
  director: 0,
  groupGeneralManager: 0,
  groupOperationalManager: 1,
  operationalManager: 2,
  restaurantManager: 3,
  wholefoodManager: 3,
  restaurantSupervisor: 5,
  wholefoodSupervisor: 5,
  restaurantCaptain: 6,
  waiter: 7,
  runner: 8,
  groupFinancialController: 1,
  chiefAccounting: 2,
  costControl: 5,
  cashierSupervisor: 5,
  apGeneralCashier: 6,
  arIncomeAudit: 6,
  receivingStorekeeper: 7,
  accountingAdmin: 7,
  cashier: 7,
  wholefoodCashier: 8,
  groupHrManager: 1,
  juniorHrManager: 3,
  trainingDevelopmentSupervisor: 5,
  hrGeneralAdmin: 6,
  directorOfSalesMarketing: 1,
  creativeMarketingManager: 2,
  socialMediaSpecialist: 6,
  juniorGraphicDesigner: 6,
  purchasingManager: 2,
  purchasingSupervisor: 5,
  driverLeader: 6,
  driver: 7,
  groupExecutiveChef: 2,
  headChef: 3,
  chiefBaker: 3,
  sousChef: 4,
  sousChefBaker: 4,
  chefDePartie: 5,
  chefDePartieBaker: 5,
  demiChefDePartie: 6,
  demiChefBaker: 6,
  cook: 7,
  cookBaker: 7,
  cookHelper: 8,
  steward: 8,
  groupBarManager: 2,
  barManager: 3,
  assistantBarManager: 4,
  barSupervisor: 5,
  barCaptain: 6,
  barista: 7,
  barBack: 8,
  restaurantMaintenanceManager: 3,
  engineerCivil: 7,
  engineerMep: 7,
  publicAreaAttendant: 8,
  securitySupervisor: 5,
  securityGuard: 8,
  trainee: 8,
  dailyWorker: 8,
}

export const POSITION_LABELS: Record<string, string> = {
  ceo: 'Chief Executive Officer (CEO)',
  director: 'Director',
  groupGeneralManager: 'Group General Manager',
  groupOperationalManager: 'Group Operational Manager',
  operationalManager: 'Operational Manager',
  restaurantManager: 'Restaurant Manager',
  wholefoodManager: 'Wholefood Manager',
  restaurantSupervisor: 'Restaurant Supervisor',
  wholefoodSupervisor: 'Wholefood Supervisor',
  restaurantCaptain: 'Restaurant Captain',
  waiter: 'Waiter / Waitress',
  runner: 'Runner',
  groupFinancialController: 'Group Financial Controller',
  chiefAccounting: 'Chief Accountant',
  costControl: 'Cost Control',
  cashierSupervisor: 'Cashier Supervisor',
  apGeneralCashier: 'GC & AP',
  arIncomeAudit: 'AR & IA',
  receivingStorekeeper: 'Receiving & Storekeeper',
  accountingAdmin: 'Accounting Admin',
  cashier: 'Cashier',
  wholefoodCashier: 'Wholefood Cashier',
  groupHrManager: 'Group HR Manager',
  juniorHrManager: 'Jr. HR Manager',
  trainingDevelopmentSupervisor: 'Training & Development Supervisor',
  hrGeneralAdmin: 'HR & General Admin',
  directorOfSalesMarketing: 'Director of Sales & Marketing',
  creativeMarketingManager: 'Creative & Marketing Manager',
  socialMediaSpecialist: 'Social Media Specialist',
  juniorGraphicDesigner: 'Jr. Graphic Designer',
  purchasingManager: 'Purchasing Manager',
  purchasingSupervisor: 'Purchasing Supervisor',
  driverLeader: 'Driver Leader',
  driver: 'Driver',
  groupExecutiveChef: 'Group Executive Chef',
  headChef: 'Head Chef',
  chiefBaker: 'Chief Baker',
  sousChef: 'Sous Chef',
  sousChefBaker: 'Sous Chef Baker',
  chefDePartie: 'Chef de Partie',
  chefDePartieBaker: 'Chef de Partie Baker / Pastry',
  demiChefDePartie: 'Demi Chef',
  demiChefBaker: 'Demi Chef Baker',
  cook: 'Cook',
  cookBaker: 'Cook Baker / Pastry',
  cookHelper: 'Cook Helper',
  steward: 'Steward',
  groupBarManager: 'Group Bar Manager',
  barManager: 'Bar Manager',
  assistantBarManager: 'Assistant Bar Manager',
  barSupervisor: 'Bar Supervisor',
  barCaptain: 'Bar Captain',
  barista: 'Barista / Bartender',
  barBack: 'Bar Back',
  restaurantMaintenanceManager: 'Restaurant & Maintenance Manager',
  engineerCivil: 'Engineer (Civil)',
  engineerMep: 'Engineering MEP',
  publicAreaAttendant: 'Public Area Attendant',
  securitySupervisor: 'Security Supervisor',
  securityGuard: 'Security Guard',
  trainee: 'Trainee',
  dailyWorker: 'Daily Worker (DW)',
}

/**
 * Same per-department curation as the client mirror (src/constants/positions.ts)
 * — see its comment for the full rationale, including why `housekeeping` is
 * deliberately empty, why several catalog ids above are no longer selectable
 * from any department after the 2026-08-17 revision, and why three baking
 * titles need `positionsFor`'s outlet check on top of this department list
 * (`kitchen` is staffed by both `the_bakery_kitchen` and the standard
 * restaurant outlets). Keep both copies in step.
 */
export const DEPARTMENT_POSITION_IDS: Record<string, readonly string[]> = {
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
  housekeeping: [],
  wholefood_retail: ['wholefoodManager', 'wholefoodSupervisor', 'wholefoodCashier'],
}

const STANDARD_RESTAURANT_OUTLET_IDS = ['nourish_ungasan', 'nourish_uluwatu', 'nourish_berawa']

/** Positions restricted to specific outlets, on top of their department scoping — see the client mirror's comment. */
export const OUTLET_ONLY_POSITION_IDS: Record<string, readonly string[]> = {
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

export function positionsFor(outletId: string, departmentId: string): readonly string[] {
  return (DEPARTMENT_POSITION_IDS[departmentId] ?? []).filter((id) => {
    const restriction = OUTLET_ONLY_POSITION_IDS[id]
    return !restriction || restriction.includes(outletId)
  })
}
