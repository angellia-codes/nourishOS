import { POSITION_LABELS, POSITION_RANKS, DEPARTMENT_POSITION_IDS } from '../../lib/positions'
import type { PositionLevel } from './types'
import type { PositionSeed } from './types'

/**
 * Positions Master seed data — POSITIONS_MASTER_DESIGN.md §3/§5, thinned per
 * the confirmed 2026-08-24 scope call: no source Google Drive JD library
 * exists in this repo, so only the tier ladder and the §5 Department Head →
 * subordinate scorer mapping are seeded here. Every position ships
 * `positionStatus: 'draft'`, empty `keyResponsibilities: []` — HR authors
 * real JD content in-app later (§7's own fallback path, not a shortcut).
 *
 * `title` duplicates the English label into both languages — no Indonesian
 * translation data exists yet either; a known simplification, not an
 * oversight, same class as the rest of this thin seed.
 */

const RANK_TO_LEVEL: Record<number, PositionLevel> = {
  0: '0',
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
}

/**
 * Canonical department per position, derived from the already hand-curated
 * `DEPARTMENT_POSITION_IDS` (2026-08-17 pass) rather than re-deriving from
 * POSITIONS.md §3's own JD-grouping (a different taxonomy that doesn't line
 * up 1:1 — same mismatch that map's own header comment documents). Priority
 * order matters only for the handful of ids that appear under more than one
 * department (e.g. the Culinary titles under both `kitchen` and
 * `central_kitchen`) — first match wins.
 */
const DEPARTMENT_PRIORITY = [
  'admin_general',
  'cashier',
  'fb_service',
  'bar',
  'kitchen',
  'central_kitchen',
  'sales_marketing',
  'security',
  'engineering_pomec',
  'human_resources',
  'finance_accounting',
  'driver',
  'housekeeping',
  'wholefood_retail',
]

/**
 * The ~15 catalog ids `DEPARTMENT_POSITION_IDS`'s own header comment names as
 * "unreachable from any department" after the 2026-08-17 revision (kept in
 * the catalog only so legacy employee records keep resolving to a label).
 * Positions Master is department-and-catalog independent of that
 * employee-assignment dropdown, so these still need a canonical department —
 * resolved here by hand against POSITIONS.md §3's own department heading.
 */
const ORPHAN_DEPARTMENT_FALLBACK: Record<string, string> = {
  ceo: 'admin_general',
  groupOperationalManager: 'fb_service',
  operationalManager: 'fb_service',
  runner: 'fb_service',
  groupBarManager: 'bar',
  barBack: 'bar',
  assistantBarManager: 'bar',
  directorOfSalesMarketing: 'sales_marketing',
  socialMediaSpecialist: 'sales_marketing',
  engineerCivil: 'engineering_pomec',
  groupHrManager: 'human_resources',
  trainingDevelopmentSupervisor: 'human_resources',
  groupFinancialController: 'finance_accounting',
  costControl: 'finance_accounting',
  arIncomeAudit: 'finance_accounting',
}

function resolveDepartmentId(positionId: string): string {
  for (const departmentId of DEPARTMENT_PRIORITY) {
    if (DEPARTMENT_POSITION_IDS[departmentId]?.includes(positionId)) return departmentId
  }
  return ORPHAN_DEPARTMENT_FALLBACK[positionId] ?? 'admin_general'
}

/**
 * POSITIONS_MASTER_DESIGN.md §5 — Department Head → subordinate scorer
 * mapping, verbatim. Only appraisalScorerPositionId-bearing (dualScorer,
 * level IV–VIII) positions appear here; everything else (including the DH
 * positions themselves, which are soloScorer and GM-scored directly) stays
 * null — an unset scorer is a normal, visible `scorerUnassigned` state
 * (§2.5), not a bug, so nothing beyond what §5 literally names is inferred.
 */
const APPRAISAL_SCORER_MAP: Record<string, string> = {
  // Culinary — Head Chef
  sousChef: 'headChef',
  chefDePartie: 'headChef',
  demiChefDePartie: 'headChef',
  cook: 'headChef',
  cookHelper: 'headChef',
  steward: 'headChef',
  // Bakery — Chief Baker
  chefDePartieBaker: 'chiefBaker',
  cookBaker: 'chiefBaker',
  // Bar — Bar Manager
  barSupervisor: 'barManager',
  barCaptain: 'barManager',
  barista: 'barManager',
  // Wholefood — Wholefood Manager
  wholefoodSupervisor: 'wholefoodManager',
  wholefoodCashier: 'wholefoodManager',
  // F&B Service — Restaurant Manager
  restaurantSupervisor: 'restaurantManager',
  restaurantCaptain: 'restaurantManager',
  waiter: 'restaurantManager',
  // Cashier + Finance & Accounting — Chief Accountant
  cashierSupervisor: 'chiefAccounting',
  cashier: 'chiefAccounting',
  apGeneralCashier: 'chiefAccounting',
  arIncomeAudit: 'chiefAccounting',
  accountingAdmin: 'chiefAccounting',
  // Purchasing & Logistics — Purchasing Manager
  purchasingSupervisor: 'purchasingManager',
  receivingStorekeeper: 'purchasingManager',
  driverLeader: 'purchasingManager',
  driver: 'purchasingManager',
  // Engineering — Restaurant & Maintenance Manager
  engineerCivil: 'restaurantMaintenanceManager',
  engineerMep: 'restaurantMaintenanceManager',
  // Sales & Marketing — Creative & Marketing Manager (0 headcount seat, non-blocking per §5)
  juniorGraphicDesigner: 'creativeMarketingManager',
  // HR & Security — Group HR Manager
  hrGeneralAdmin: 'groupHrManager',
  securitySupervisor: 'groupHrManager',
  securityGuard: 'groupHrManager',
  // Cost Control (Level V, Finance) deliberately absent — §5 non-blocking scorerUnassigned.
}

const NON_APPRAISABLE_IDS = new Set(['trainee', 'dailyWorker'])

export const POSITION_SEEDS: PositionSeed[] = Object.entries(POSITION_LABELS).map(([positionId, label]) => {
  const rank = POSITION_RANKS[positionId] ?? 8
  const level = RANK_TO_LEVEL[rank]

  return {
    positionId,
    title: { en: label, id: label },
    departmentId: resolveDepartmentId(positionId),
    level,
    appraisalScorerPositionId: APPRAISAL_SCORER_MAP[positionId] ?? null,
    isAppraisable: level !== '0' && !NON_APPRAISABLE_IDS.has(positionId),
  }
})
