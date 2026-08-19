/**
 * Known duplication (see collections.ts) — mirrors src/constants/positions.ts
 * (POSITIONS.md §3/§4) so createEmployee/updateEmployee can validate a
 * position against the org-wide catalog without trusting the client. Pairs
 * with organization.ts, which this reuses departmentId keys from. Keep both
 * copies in step.
 */

export const POSITION_LABELS: Record<string, string> = {
  ceo: 'Chief Executive Officer (CEO)',
  director: 'Director',
  groupGeneralManager: 'Group General Manager',
  groupOperationalManager: 'Group Operational Manager',
  operationalManager: 'Operational Manager',
  restaurantManager: 'Restaurant Manager',
  wholefoodsManager: 'Wholefoods Manager',
  restaurantSupervisor: 'Restaurant Supervisor',
  wholefoodsSupervisor: 'Wholefoods Supervisor',
  restaurantCaptain: 'Restaurant Captain',
  waiter: 'Waiter / Waitress',
  runner: 'Runner',
  groupFinancialController: 'Group Financial Controller',
  chiefAccounting: 'Chief Accounting',
  costControl: 'Cost Control',
  cashierSupervisor: 'Cashier Supervisor',
  apGeneralCashier: 'AP & GC (Accounts Payable & General Cashier)',
  arIncomeAudit: 'AR & IA (Accounts Receivable & Income Audit)',
  receivingStorekeeper: 'Receiving & Storekeeper',
  accountingAdmin: 'Accounting Admin',
  cashier: 'Cashier',
  wholefoodsCashier: 'Wholefoods Cashier',
  groupHrManager: 'Group HR Manager',
  juniorHrManager: 'Junior HR Manager',
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
  demiChefDePartie: 'Demi Chef de Partie',
  demiChefBaker: 'Demi Chef Baker',
  cook: 'Cook',
  cookBaker: 'Cook / Baker',
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
  engineerMep: 'Engineer (MEP)',
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
  bar: ['barManager', 'barSupervisor', 'barCaptain', 'barista', 'trainee', 'dailyWorker'],
  kitchen: [
    'headChef',
    'chiefBaker',
    'sousChef',
    'chefDePartie',
    'chefDePartieBaker',
    'demiChefDePartie',
    'cook',
    'cookBaker',
    'cookHelper',
    'steward',
    'trainee',
    'dailyWorker',
  ],
  central_kitchen: [
    'groupExecutiveChef',
    'headChef',
    'chiefBaker',
    'sousChef',
    'sousChefBaker',
    'chefDePartie',
    'chefDePartieBaker',
    'demiChefDePartie',
    'demiChefBaker',
    'cook',
    'cookBaker',
    'cookHelper',
    'steward',
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
  wholefood_retail: ['wholefoodsManager', 'wholefoodsSupervisor', 'wholefoodsCashier'],
}

const STANDARD_RESTAURANT_OUTLET_IDS = ['nourish_ungasan', 'nourish_uluwatu', 'nourish_berawa']

/** Positions restricted to specific outlets, on top of their department scoping — see the client mirror's comment. */
export const OUTLET_ONLY_POSITION_IDS: Record<string, readonly string[]> = {
  chiefBaker: ['the_bakery_kitchen'],
  chefDePartieBaker: ['the_bakery_kitchen'],
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
