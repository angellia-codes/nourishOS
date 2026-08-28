import type { EquipmentCategory, EquipmentCriticality, EquipmentStatus } from '@/types'
import { ROLES, type Role } from './roles'

/**
 * Roles firestore.rules lets read every outlet's equipment — it mirrors the
 * `match /equipment/{equipmentId}` block, and nothing else.
 *
 * Deliberately NOT CROSS_OUTLET_ROLES, which omits `engineering`: on a `list`
 * the rule is evaluated against the query, so scoping Engineering to its own
 * outlet here would silently deny them the cross-outlet register §6.2 D9
 * grants them. If the rules block changes, change this in the same commit —
 * `npm run test:rules` pins both halves.
 */
export const EQUIPMENT_ALL_OUTLET_ROLES: readonly Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.DIRECTOR,
  ROLES.GENERAL_MANAGER,
  ROLES.ENGINEERING,
]

/**
 * equipment-master-design.md §3.6 — mirrors
 * functions/src/operations/equipment/constants.ts (functions/ is a separate
 * tsconfig project and cannot import from src/, same intentional duplication
 * as collections.ts/permissions.ts). Order matches the design doc's table.
 */
export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'refrigeration',
  'electrical',
  'cooking',
  'coffeeBar',
  'machinery',
  'hvac',
  'ventilation',
  'plumbing',
  'utility',
]

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  refrigeration: 'Refrigeration',
  electrical: 'Electrical',
  cooking: 'Cooking',
  coffeeBar: 'Coffee & Bar',
  machinery: 'Machinery',
  hvac: 'HVAC',
  ventilation: 'Ventilation',
  plumbing: 'Plumbing',
  utility: 'Utility',
}

export const EQUIPMENT_CATEGORY_CODES: Record<EquipmentCategory, string> = {
  refrigeration: 'CHL',
  electrical: 'ELC',
  cooking: 'CKG',
  coffeeBar: 'CFB',
  machinery: 'MCH',
  hvac: 'HVC',
  ventilation: 'VNT',
  plumbing: 'PLM',
  utility: 'UTL',
}

export const EQUIPMENT_CATEGORY_CRITICALITY_DEFAULTS: Record<EquipmentCategory, EquipmentCriticality> = {
  refrigeration: 'critical',
  electrical: 'critical',
  cooking: 'high',
  coffeeBar: 'high',
  machinery: 'high',
  hvac: 'medium',
  ventilation: 'medium',
  plumbing: 'medium',
  utility: 'low',
}

export const EQUIPMENT_CRITICALITIES: EquipmentCriticality[] = ['critical', 'high', 'medium', 'low']

export const EQUIPMENT_CRITICALITY_LABELS: Record<EquipmentCriticality, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: 'Active',
  underRepair: 'Under Repair',
  decommissioned: 'Decommissioned',
}

/** §4.1's CSV template column order. */
export const EQUIPMENT_CSV_COLUMNS = [
  'name',
  'category',
  'outletCode',
  'area',
  'equipmentType',
  'manufacturer',
  'model',
  'serialNumber',
  'locationDetail',
  'departmentCode',
  'criticality',
  'installDate',
  'warrantyExpiryDate',
  'serviceVendorName',
  'assetCode',
  'notes',
] as const
