import type { BaseDocument } from './firestore.types'

/** equipment-master-design.md §3.6 — drives PM templates (Module B) and the criticality default. */
export type EquipmentCategory =
  | 'refrigeration'
  | 'electrical'
  | 'cooking'
  | 'coffeeBar'
  | 'machinery'
  | 'hvac'
  | 'ventilation'
  | 'plumbing'
  | 'utility'

export type EquipmentCriticality = 'critical' | 'high' | 'medium' | 'low'

/** §5.1 — 'decommissioned' is server-owned, set only once a decommission request resolves. */
export type EquipmentStatus = 'active' | 'underRepair' | 'decommissioned'

/**
 * One facility asset (§3.2) — a machine fixed to or operating within an
 * outlet, maintained on a schedule, not issued to a person (§1.3's boundary
 * against `employeeAssets`). `status` overrides BaseDocument's generic
 * status field, same deviation incident-report.md already made.
 */
export interface Equipment extends Omit<BaseDocument, 'departmentId'> {
  assetCode: string
  name: string
  category: EquipmentCategory
  /** Free text, descriptive only — never group or filter on this (§3.2). */
  equipmentType: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  outletId: string
  area: string
  locationDetail: string | null
  departmentId: string | null
  criticality: EquipmentCriticality
  /** false = inherited from the category default; true = a deliberate per-asset override. */
  criticalityOverridden: boolean
  status: EquipmentStatus
  decommissionedAt: string | null
  decommissionedBy: string | null
  decommissionReason: string | null
  decommissionApprovalRequestId: string | null
  installDate: string | null
  warrantyExpiryDate: string | null
  serviceVendorName: string | null
  photoFileId: string | null
  notes: string | null
}

export interface EquipmentImportRow {
  rowNumber: number
  name: string
  category: EquipmentCategory
  outletId: string
  area: string
  equipmentType: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  locationDetail: string | null
  departmentId: string | null
  criticality: EquipmentCriticality
  criticalityOverridden: boolean
  installDate: string | null
  warrantyExpiryDate: string | null
  serviceVendorName: string | null
  notes: string | null
}

export interface EquipmentImportUpdateRow extends EquipmentImportRow {
  equipmentId: string
  assetCode: string
  changedFields: string[]
}

export interface EquipmentImportError {
  rowNumber: number
  column: string
  value: string
  message: string
}

export interface EquipmentImportWarning {
  rowNumber: number
  message: string
}

/** previewEquipmentImport's response shape (§4.5), plus the token commitEquipmentImport needs back. */
export interface EquipmentImportPreview {
  previewToken: string
  totalRows: number
  inserts: EquipmentImportRow[]
  updates: EquipmentImportUpdateRow[]
  errors: EquipmentImportError[]
  warnings: EquipmentImportWarning[]
  canCommit: boolean
}
