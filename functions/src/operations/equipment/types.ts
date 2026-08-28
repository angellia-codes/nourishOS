/**
 * equipment-master-design.md §3.2/§3.6. Functions-side: only the editable
 * field subset is typed (EquipmentFields, same convention
 * security/fireExtinguishers/helpers.ts's ExtinguisherFields uses) — the
 * full document shape lives on the frontend as `Equipment` (src/types).
 */
export const EQUIPMENT_CATEGORIES = [
  'refrigeration',
  'electrical',
  'cooking',
  'coffeeBar',
  'machinery',
  'hvac',
  'ventilation',
  'plumbing',
  'utility',
] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

export const EQUIPMENT_CRITICALITIES = ['critical', 'high', 'medium', 'low'] as const
export type EquipmentCriticality = (typeof EQUIPMENT_CRITICALITIES)[number]

/** §5.1 — 'decommissioned' is server-owned, set only by the approval-resolved handler. */
export const EQUIPMENT_STATUSES = ['active', 'underRepair', 'decommissioned'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

// A `type`, not an `interface` — recordAuditEvent's Record<string, unknown>
// needs the implicit index signature only a type alias gets (same reason
// ExtinguisherFields next door in fireExtinguishers is one).
export type EquipmentFields = {
  name: string
  category: EquipmentCategory
  equipmentType: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  outletId: string
  area: string
  locationDetail: string | null
  departmentId: string | null
  criticality: EquipmentCriticality
  criticalityOverridden: boolean
  installDate: string | null
  warrantyExpiryDate: string | null
  serviceVendorName: string | null
  notes: string | null
}

/** The subset of a stored `equipment` doc the import matcher and diff need. */
export type ExistingEquipmentRecord = EquipmentFields & {
  id: string
  assetCode: string
  status: EquipmentStatus
}
