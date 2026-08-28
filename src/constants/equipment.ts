import type { EquipmentCategory, EquipmentCriticality, EquipmentStatus } from '@/types'

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
