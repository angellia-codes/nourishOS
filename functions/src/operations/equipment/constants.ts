import { EQUIPMENT_CATEGORIES, type EquipmentCategory, type EquipmentCriticality } from './types'

/** equipment-master-design.md §3.6 — the category table, verbatim. */
export const CATEGORY_CODES: Record<EquipmentCategory, string> = {
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

/**
 * §3.6 — the default a non-overridden asset's criticality is derived from.
 * A-O4 (electrical defaulting to `critical` covering both a distribution
 * board and a staff-room socket circuit) is open per the doc — left as
 * specced; `criticalityOverridden` is exactly the escape hatch for it.
 */
export const CATEGORY_CRITICALITY_DEFAULTS: Record<EquipmentCategory, EquipmentCriticality> = {
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

/** Case-insensitive CSV `category` column resolution (§4.1). */
export const CATEGORY_BY_LOWER: Record<string, EquipmentCategory> = Object.fromEntries(
  EQUIPMENT_CATEGORIES.map((category) => [category.toLowerCase(), category]),
)
