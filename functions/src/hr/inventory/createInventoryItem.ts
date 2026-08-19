import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { validateCategory, validateUnitCost, validateSizes } from './helpers'

interface CreateInventoryItemInput {
  name: string
  category: string
  unitCost: number
  hasSizes: boolean
  sizes?: string[]
}

/**
 * HR Inventory catalog item — uniforms and simple assets tracked as a
 * quantity ledger. No stock levels are created here; the first receiveStock
 * call against this item creates its stock-level docs lazily.
 */
export const createInventoryItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<CreateInventoryItemInput>

    if (!input.name?.trim()) {
      throw new AppError('invalid-argument', 'name is required.')
    }
    const category = validateCategory(input.category)
    const unitCost = validateUnitCost(input.unitCost)
    const hasSizes = Boolean(input.hasSizes)
    const sizes = validateSizes(hasSizes, input.sizes)

    const itemRef = db.collection(COLLECTIONS.HR_INVENTORY_ITEMS).doc()
    await itemRef.set({
      name: input.name.trim(),
      category,
      unitCost,
      hasSizes,
      sizes,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'InventoryItemCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'inventoryItem',
      resourceId: itemRef.id,
      action: 'create',
      user,
      newValues: { name: input.name.trim(), category, unitCost, hasSizes, sizes },
    })

    return successResponse({ itemId: itemRef.id }, 'Item created.')
  } catch (error) {
    handleError(error)
  }
})
