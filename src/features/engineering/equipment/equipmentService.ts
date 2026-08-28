import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Equipment, EquipmentCategory, EquipmentCriticality, EquipmentImportPreview, EquipmentStatus } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface EquipmentFormInput {
  outletId: string
  name: string
  category: EquipmentCategory
  equipmentType?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  area: string
  locationDetail?: string
  departmentId?: string
  criticality?: EquipmentCriticality
  installDate?: string
  warrantyExpiryDate?: string
  serviceVendorName?: string
  notes?: string
}

export function createEquipment(input: EquipmentFormInput): Promise<{ equipmentId: string; assetCode: string }> {
  return callFunction('createEquipment', input)
}

/** `outletId` is ignored server-side on an edit — transferEquipmentOutlet is the only path that moves an asset. */
export function updateEquipment(input: EquipmentFormInput & { equipmentId: string }): Promise<{ equipmentId: string }> {
  return callFunction('updateEquipment', input)
}

export function updateEquipmentStatus(
  equipmentId: string,
  status: Extract<EquipmentStatus, 'active' | 'underRepair'>,
): Promise<{ equipmentId: string; status: EquipmentStatus }> {
  return callFunction('updateEquipmentStatus', { equipmentId, status })
}

export function transferEquipmentOutlet(input: {
  equipmentId: string
  outletId: string
  area: string
}): Promise<{ equipmentId: string }> {
  return callFunction('transferEquipmentOutlet', input)
}

export function requestEquipmentDecommission(
  equipmentId: string,
  reason: string,
): Promise<{ equipmentId: string; approvalRequestId: string }> {
  return callFunction('requestEquipmentDecommission', { equipmentId, reason })
}

/** §4.2 phase 1 — writes nothing. */
export function previewEquipmentImport(rows: Record<string, string>[]): Promise<EquipmentImportPreview> {
  return callFunction('previewEquipmentImport', { rows })
}

/** §4.2 phase 2 — re-sends the same rows the preview validated; the server re-validates from scratch. */
export function commitEquipmentImport(input: {
  previewToken: string
  rows: Record<string, string>[]
  fileName?: string
}): Promise<{ insertCount: number; updateCount: number }> {
  return callFunction('commitEquipmentImport', input)
}

export function getEquipment(equipmentId: string): Promise<Equipment | null> {
  return getDocument<Equipment>(COLLECTIONS.EQUIPMENT, equipmentId)
}

/**
 * The whole register this viewer's outlet-scoped rules allow (§6 — elevated
 * roles see every outlet, everyone else only their own; firestore.rules
 * enforces this per document, so the query itself needs no outlet filter).
 * Client-side filtering for outlet/area/category/criticality/status on top,
 * same "dozens, not thousands" assumption fireExtinguisherService makes.
 */
export function subscribeToRegister(onChange: (equipment: Equipment[]) => void): Unsubscribe {
  return subscribeToCollection<Equipment>(COLLECTIONS.EQUIPMENT, [orderBy('assetCode', 'asc')], onChange)
}
