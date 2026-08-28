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
 * Roles selectable within each department, from the RBAC.md §4 role
 * descriptions read against the POSITIONS.md §3 departmental mapping.
 *
 * `superAdmin` appears in no list on purpose: it can rewrite roles, users,
 * and settings, so it stays a bootstrap-only assignment rather than
 * something a stranger with a Google account can pick out of a dropdown.
 */
export const DEPARTMENT_ROLES: Record<string, readonly Role[]> = {
  admin_general: [ROLES.GENERAL_MANAGER, ROLES.DIRECTOR],
  cashier: [ROLES.FINANCE, ROLES.STAFF],
  fb_service: [ROLES.RESTAURANT_MANAGER, ROLES.FLOOR_LEADER, ROLES.STAFF],
  bar: [ROLES.BAR_LEADER, ROLES.STAFF],
  kitchen: [ROLES.KITCHEN_LEADER, ROLES.BAKERY_LEADER, ROLES.STAFF],
  central_kitchen: [ROLES.KITCHEN_LEADER, ROLES.STAFF],
  sales_marketing: [ROLES.MARKETING, ROLES.STAFF],
  security: [ROLES.SECURITY, ROLES.STAFF],
  engineering_pomec: [ROLES.ENGINEERING, ROLES.STAFF],
  human_resources: [ROLES.HR_MANAGER, ROLES.STAFF],
  finance_accounting: [ROLES.FINANCE, ROLES.PURCHASING, ROLES.STAFF],
  driver: [ROLES.PURCHASING, ROLES.STAFF],
  housekeeping: [ROLES.STAFF],
  wholefood_retail: [ROLES.WHOLEFOOD_LEADER, ROLES.WHOLEFOOD_CASHIER, ROLES.STAFF],
}

/** Display labels for the role dropdown — RBAC.md §4 headings. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.GENERAL_MANAGER]: 'General Manager',
  [ROLES.HR_MANAGER]: 'HR Manager',
  [ROLES.FINANCE]: 'Finance',
  [ROLES.PURCHASING]: 'Purchasing',
  [ROLES.KITCHEN_LEADER]: 'Kitchen Leader',
  [ROLES.BAR_LEADER]: 'Bar Leader',
  [ROLES.FLOOR_LEADER]: 'Floor Leader',
  [ROLES.BAKERY_LEADER]: 'Bakery Leader',
  [ROLES.WHOLEFOOD_LEADER]: 'Wholefood Leader',
  [ROLES.SECURITY]: 'Security',
  [ROLES.ENGINEERING]: 'Engineering',
  [ROLES.OUTLET_MANAGER]: 'Outlet Manager',
  [ROLES.RESTAURANT_MANAGER]: 'Restaurant Manager',
  [ROLES.WHOLEFOOD_CASHIER]: 'Wholefood Cashier',
  [ROLES.MARKETING]: 'Marketing',
  [ROLES.STAFF]: 'Staff',
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