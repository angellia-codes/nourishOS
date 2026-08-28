import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy, where } from '@/services/firestore'
import { COLLECTIONS, EQUIPMENT_ALL_OUTLET_ROLES } from '@/constants'
import type { Equipment, EquipmentCategory, EquipmentCriticality, EquipmentImportPreview, EquipmentStatus, UserProfile } from '@/types'
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
 * The register, scoped to what this viewer's rules allow (§6 — elevated roles
 * see every outlet, everyone else only their own).
 *
 * The outlet filter is on the QUERY, not applied client-side afterwards. On a
 * `list` firestore.rules is evaluated against the query rather than each
 * document, so `resource.data.outletId == request.auth.token.outletId` has to
 * be provable from the constraints — an unfiltered query is denied outright
 * for a non-elevated caller rather than returning their outlet's subset. This
 * previously sent `orderBy('assetCode')` alone and left the outlet to a
 * client-side filter, which meant the register rendered permanently empty for
 * every leader and staff member (AC #12 unmet). Pinned by
 * `npm run test:rules`.
 *
 * Area/category/criticality/status filtering stays client-side, same "dozens,
 * not thousands" assumption fireExtinguisherService makes — those fields carry
 * no rule condition, so they cost nothing to leave off the query.
 */
export function subscribeToRegister(
  viewer: Pick<UserProfile, 'roleId' | 'outletId'>,
  onChange: (equipment: Equipment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const constraints = EQUIPMENT_ALL_OUTLET_ROLES.includes(viewer.roleId)
    ? [orderBy('assetCode', 'asc')]
    : [where('outletId', '==', viewer.outletId), orderBy('assetCode', 'asc')]

  return subscribeToCollection<Equipment>(COLLECTIONS.EQUIPMENT, constraints, onChange, onError)
}
