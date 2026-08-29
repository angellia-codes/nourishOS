import { ROLES, type Role } from './roles'

/**
 * Outlets, departments, and the narrowing between them — transcribed from
 * OUTLETS_DEPARTMENTS.md §1/§2 and POSITIONS.md §3.
 *
 * Kept as constants rather than `outlets`/`departments` Firestore documents
 * because nothing edits this list today: there is no Settings UI, so live
 * docs would need a seed script and a rules block to serve the same nine
 * outlets. Mirrored server-side in functions/src/lib/organization.ts, which
 * is what actually validates a registration — same intentional duplication
 * as collections.ts / permissions.ts.
 */

export interface OrgOption {
  id: string
  name: string
}

/** OUTLETS_DEPARTMENTS.md §1. */
export const OUTLETS: readonly OrgOption[] = [
  { id: 'nourish_ungasan', name: 'Nourish Ungasan' },
  { id: 'nourish_uluwatu', name: 'Nourish Uluwatu' },
  { id: 'nourish_berawa', name: 'Nourish Berawa' },
  { id: 'the_bakery_uluwatu', name: 'The Bakery Uluwatu' },
  { id: 'the_bakery_kitchen', name: 'The Bakery Kitchen' },
  { id: 'wholefood_ungasan', name: 'Wholefood Ungasan' },
  { id: 'wholefood_uluwatu', name: 'Wholefood Uluwatu' },
  { id: 'wholefood_berawa', name: 'Wholefood Berawa' },
  { id: 'boh_nourish_group', name: 'BOH Nourish Group' },
]

/** OUTLETS_DEPARTMENTS.md §2. */
export const DEPARTMENTS: readonly OrgOption[] = [
  { id: 'admin_general', name: 'Admin & General' },
  { id: 'cashier', name: 'Cashier' },
  { id: 'fb_service', name: 'F&B Service' },
  { id: 'bar', name: 'Bar' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'central_kitchen', name: 'Central Kitchen' },
  { id: 'sales_marketing', name: 'Sales & Marketing' },
  { id: 'security', name: 'Security' },
  { id: 'engineering_pomec', name: 'Engineering/POMEC' },
  { id: 'human_resources', name: 'Human Resources' },
  { id: 'finance_accounting', name: 'Finance & Accounting' },
  { id: 'driver', name: 'Driver' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'wholefood_retail', name: 'Wholefood/Retail' },
]

/**
 * Which departments a given outlet actually staffs.
 *
 * OUTLETS_DEPARTMENTS.md registers outlets and departments but never maps one
 * to the other, so this is derived from each outlet's concept type (§1) plus
 * the "Primary Operational Scope" column (§2): HQ-scoped departments appear
 * only at BOH, retail-scoped only at Wholefood, and so on. Adjust here when
 * an outlet's staffing changes — the register form and the server validation
 * both read this map.
 *
 * Admin & General (§2: "HQ / Outlet Management") is HQ-only — it staffs
 * boh_nourish_group and nowhere else, not every outlet.
 */
export const OUTLET_DEPARTMENTS: Record<string, readonly string[]> = {
  nourish_ungasan: ['cashier', 'fb_service', 'bar', 'kitchen', 'central_kitchen', 'security'],
  nourish_uluwatu: ['cashier', 'fb_service', 'bar', 'kitchen', 'security'],
  nourish_berawa: ['cashier', 'fb_service', 'bar', 'kitchen', 'security'],
  the_bakery_uluwatu: ['cashier', 'bar'],
  the_bakery_kitchen: ['kitchen'],
  wholefood_ungasan: ['wholefood_retail'],
  wholefood_uluwatu: ['wholefood_retail'],
  wholefood_berawa: ['wholefood_retail'],
  boh_nourish_group: [
    'admin_general',
    'sales_marketing',
    'human_resources',
    'finance_accounting',
    'driver',
    'engineering_pomec',
  ],
}

/**
 * Roles selectable within each department — the org role ladder as issued by
 * HR on 2026-08-29, one role per job title rather than RBAC.md §4's coarse
 * tiers. A later pass renamed the four department-leader ids to match their
 * already-adopted labels (`floorLeader`→`restaurantSupervisor`,
 * `barLeader`→`barManager`, `kitchenLeader`→`headChef`,
 * `bakeryLeader`→`chiefBaker`) across firestore.rules, ROLE_PERMISSIONS and
 * every users/{uid} document — see the role-id migration tool for the
 * one-time data fixup this required.
 *
 * `outletManager` and `staff` are removed entirely (no department offered
 * them any more before removal). `outletManager`'s outlet-wide-approver role
 * is resolved per outlet by `OUTLET_LEAD_ROLE` in
 * functions/src/lib/organization.ts — a server-only concern, no client mirror.
 *
 * `superAdmin` appears in no list on purpose: it can rewrite roles, users,
 * and settings, so it stays a bootstrap-only assignment rather than
 * something a stranger with a Google account can pick out of a dropdown.
 */
export const DEPARTMENT_ROLES: Record<string, readonly Role[]> = {
  admin_general: [ROLES.GENERAL_MANAGER, ROLES.DIRECTOR],
  cashier: [ROLES.CASHIER_SUPERVISOR, ROLES.CASHIER],
  fb_service: [ROLES.RESTAURANT_MANAGER, ROLES.RESTAURANT_SUPERVISOR, ROLES.RESTAURANT_CAPTAIN, ROLES.WAITER],
  bar: [ROLES.BAR_MANAGER, ROLES.BAR_SUPERVISOR, ROLES.BAR_CAPTAIN, ROLES.BARISTA],
  // Both ladders live here because The Bakery Kitchen staffs the `kitchen`
  // department (OUTLET_DEPARTMENTS) — OUTLET_ONLY_ROLES below is what keeps a
  // Chief Baker off a restaurant's form and a Head Chef off the bakery's.
  kitchen: [
    ROLES.HEAD_CHEF,
    ROLES.SOUS_CHEF,
    ROLES.CHEF_DE_PARTIE,
    ROLES.COOK,
    ROLES.COOK_HELPER,
    ROLES.STEWARD,
    ROLES.CHIEF_BAKER,
    ROLES.CHEF_DE_PARTIE_BAKER,
    ROLES.COOK_BAKER,
  ],
  central_kitchen: [ROLES.DEMI_CHEF, ROLES.COOK_HELPER, ROLES.STEWARD],
  sales_marketing: [ROLES.MARKETING, ROLES.JUNIOR_GRAPHIC_DESIGNER],
  security: [ROLES.SECURITY, ROLES.SECURITY_GUARD],
  engineering_pomec: [ROLES.RESTAURANT_MAINTENANCE_MANAGER, ROLES.ENGINEERING],
  human_resources: [ROLES.HR_MANAGER, ROLES.HR_GENERAL_ADMIN],
  finance_accounting: [
    ROLES.FINANCE,
    ROLES.PURCHASING,
    ROLES.PURCHASING_SUPERVISOR,
    ROLES.GENERAL_CASHIER_AP,
    ROLES.AR_INCOME_AUDIT,
    ROLES.RECEIVING_STOREKEEPER,
  ],
  driver: [ROLES.DRIVER_LEADER, ROLES.DRIVER],
  // `staff` was housekeeping's only role and is removed with no replacement
  // yet — nobody currently holds it. Add a real housekeeping role here first.
  housekeeping: [],
  wholefood_retail: [ROLES.WHOLEFOOD_LEADER, ROLES.WHOLEFOOD_SUPERVISOR, ROLES.WHOLEFOOD_CASHIER],
}

/** The three restaurant outlets — the mirror image of `the_bakery_kitchen` within `kitchen`. */
const STANDARD_RESTAURANT_OUTLET_IDS = ['nourish_ungasan', 'nourish_uluwatu', 'nourish_berawa']

/**
 * Roles restricted to specific outlets on top of their department scoping —
 * the same shape (and for the same reason) as positions.ts's
 * OUTLET_ONLY_POSITION_IDS. Two departments need it:
 *
 *  - `kitchen` is staffed by `the_bakery_kitchen` and by the three restaurant
 *    outlets. The baking ladder belongs to the bakery, the line-cook ladder to
 *    the restaurants; nothing in `kitchen` is common to both.
 *  - `wholefood_retail` is staffed by all three Wholefood outlets, but only
 *    Ungasan carries a Manager and a Supervisor — Uluwatu and Berawa are
 *    cashier-only.
 *
 * A department-only lookup cannot express either, so outletId is a required
 * input wherever roles are offered or validated (`rolesFor`).
 */
export const OUTLET_ONLY_ROLES: Partial<Record<Role, readonly string[]>> = {
  chiefBaker: ['the_bakery_kitchen'],
  chefDePartieBaker: ['the_bakery_kitchen'],
  cookBaker: ['the_bakery_kitchen'],
  headChef: STANDARD_RESTAURANT_OUTLET_IDS,
  sousChef: STANDARD_RESTAURANT_OUTLET_IDS,
  chefDePartie: STANDARD_RESTAURANT_OUTLET_IDS,
  cook: STANDARD_RESTAURANT_OUTLET_IDS,
  cookHelper: STANDARD_RESTAURANT_OUTLET_IDS,
  steward: STANDARD_RESTAURANT_OUTLET_IDS,
  wholefoodLeader: ['wholefood_ungasan'],
  wholefoodSupervisor: ['wholefood_ungasan'],
}

/** The roles a department's dropdown offers at a given outlet. Mirrored in functions/src/lib/organization.ts. */
export function rolesFor(outletId: string, departmentId: string): Role[] {
  return (DEPARTMENT_ROLES[departmentId] ?? []).filter((role) => {
    const restriction = OUTLET_ONLY_ROLES[role]
    return !restriction || restriction.includes(outletId)
  })
}

/** Display labels for the role dropdown — RBAC.md §4 headings. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.GENERAL_MANAGER]: 'General Manager',
  [ROLES.HR_MANAGER]: 'Jr. HR Manager',
  [ROLES.HR_GENERAL_ADMIN]: 'HR & General Admin',
  [ROLES.FINANCE]: 'Chief Accountant',
  [ROLES.PURCHASING]: 'Purchasing Manager',
  [ROLES.PURCHASING_SUPERVISOR]: 'Purchasing Supervisor',
  [ROLES.GENERAL_CASHIER_AP]: 'GC & AP',
  [ROLES.AR_INCOME_AUDIT]: 'AR & IA',
  [ROLES.RECEIVING_STOREKEEPER]: 'Receiving & Storekeeper',
  [ROLES.DRIVER_LEADER]: 'Driver Leader',
  [ROLES.DRIVER]: 'Driver',
  [ROLES.CASHIER_SUPERVISOR]: 'Cashier Supervisor',
  [ROLES.CASHIER]: 'Cashier',
  [ROLES.RESTAURANT_MANAGER]: 'Restaurant Manager',
  [ROLES.RESTAURANT_SUPERVISOR]: 'Restaurant Supervisor',
  [ROLES.RESTAURANT_CAPTAIN]: 'Restaurant Captain',
  [ROLES.WAITER]: 'Waiter / Waitress',
  [ROLES.BAR_MANAGER]: 'Bar Manager',
  [ROLES.BAR_SUPERVISOR]: 'Bar Supervisor',
  [ROLES.BAR_CAPTAIN]: 'Bar Captain',
  [ROLES.BARISTA]: 'Barista / Bartender',
  [ROLES.HEAD_CHEF]: 'Head Chef',
  [ROLES.SOUS_CHEF]: 'Sous Chef',
  [ROLES.CHEF_DE_PARTIE]: 'Chef de Partie',
  [ROLES.COOK]: 'Cook',
  [ROLES.COOK_HELPER]: 'Cook Helper',
  [ROLES.STEWARD]: 'Steward',
  [ROLES.DEMI_CHEF]: 'Demi Chef',
  [ROLES.CHIEF_BAKER]: 'Chief Baker',
  [ROLES.CHEF_DE_PARTIE_BAKER]: 'Chef de Partie Baker / Pastry',
  [ROLES.COOK_BAKER]: 'Cook Baker / Pastry',
  [ROLES.SECURITY]: 'Security Supervisor',
  [ROLES.SECURITY_GUARD]: 'Security Guard',
  [ROLES.RESTAURANT_MAINTENANCE_MANAGER]: 'Restaurant & Maintenance Manager',
  [ROLES.ENGINEERING]: 'Engineering MEP',
  [ROLES.MARKETING]: 'Creative & Marketing Manager',
  [ROLES.JUNIOR_GRAPHIC_DESIGNER]: 'Jr. Graphic Designer',
  [ROLES.WHOLEFOOD_LEADER]: 'Wholefood Manager',
  [ROLES.WHOLEFOOD_SUPERVISOR]: 'Wholefood Supervisor',
  [ROLES.WHOLEFOOD_CASHIER]: 'Wholefood Cashier',
}

/** Options for a dropdown, resolved from an id list — keeps the pages declarative. */
export function optionsFor(ids: readonly string[], source: readonly OrgOption[]): OrgOption[] {
  return source.filter((option) => ids.includes(option.id))
}

/**
 * Per-outlet area lists — equipment-master-design.md §3.1/§4.1. Kept as a
 * constant rather than an `outlets.areas` Firestore field for the same reason
 * OUTLET_DEPARTMENTS is: there is no `outlets` collection, only this mirrored
 * pair of files. Content is a stub-then-fill task (equipment-master-design.md
 * A-O3) — Engineering/Operations should review the actual lists before the
 * first import runs; these are a reasonable starting point per outlet format,
 * not a signed-off register.
 */
export const OUTLET_AREAS: Record<string, readonly string[]> = {
  nourish_ungasan: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  nourish_uluwatu: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  nourish_berawa: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  the_bakery_uluwatu: ['bakery', 'retail', 'bar', 'coldStorage', 'backOfHouse'],
  the_bakery_kitchen: ['bakery', 'kitchen', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_ungasan: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_uluwatu: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_berawa: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  boh_nourish_group: ['office', 'warehouse', 'backOfHouse', 'exterior'],
}

/**
 * Three-letter codes feeding equipment-master-design.md §3.5's assetCode
 * format ({OUTLET}-{CAT}-{NNN}). Purely a display label baked into a
 * generated string, not a foreign key — renaming a code here needs no
 * migration of existing assets, since codes are immutable per-asset once
 * issued (§3.5).
 */
export const OUTLET_CODES: Record<string, string> = {
  nourish_ungasan: 'NUN',
  nourish_uluwatu: 'NUL',
  nourish_berawa: 'NBR',
  the_bakery_uluwatu: 'BKU',
  the_bakery_kitchen: 'BKK',
  wholefood_ungasan: 'WFN',
  wholefood_uluwatu: 'WFU',
  wholefood_berawa: 'WFB',
  boh_nourish_group: 'BOH',
}