import { AlertOctagon, AlertTriangle, Archive, CircleDot, Info, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui'
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_CRITICALITY_LABELS, EQUIPMENT_STATUS_LABELS } from '@/constants'
import type { Equipment, EquipmentCriticality, EquipmentStatus } from '@/types'

export const EQUIPMENT_STATUS_TONE: Record<EquipmentStatus, StatusTone> = {
  active: 'success',
  underRepair: 'warning',
  decommissioned: 'closed',
}

export const EQUIPMENT_STATUS_ICON: Record<EquipmentStatus, LucideIcon> = {
  active: ShieldCheck,
  underRepair: Wrench,
  decommissioned: Archive,
}

export const EQUIPMENT_CRITICALITY_TONE: Record<EquipmentCriticality, StatusTone> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

export const EQUIPMENT_CRITICALITY_ICON: Record<EquipmentCriticality, LucideIcon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: Info,
  low: CircleDot,
}

/** "Refrigeration — Walk-in Chiller" style spec line, mirroring fireExtinguisherFormat's formatUnitSpec. */
export function formatCategorySpec(equipment: Equipment): string {
  const base = EQUIPMENT_CATEGORY_LABELS[equipment.category] ?? equipment.category
  return equipment.equipmentType ? `${base} — ${equipment.equipmentType}` : base
}

export function formatCriticalityLabel(equipment: Equipment): string {
  const label = EQUIPMENT_CRITICALITY_LABELS[equipment.criticality] ?? equipment.criticality
  return equipment.criticalityOverridden ? `${label} (override)` : label
}

export function formatStatusLabel(status: EquipmentStatus): string {
  return EQUIPMENT_STATUS_LABELS[status] ?? status
}
