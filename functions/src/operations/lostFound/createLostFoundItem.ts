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
import { notifyUsersByRole } from '../../shared/notifications'
import { RETENTION_DAYS, calculateRetentionExpiresAt, allocateLostFoundItemNumber, type LostFoundCategory, type LostFoundValueTier } from './helpers'

const CATEGORIES = Object.keys(RETENTION_DAYS) as LostFoundCategory[]
const VALUE_TIERS: LostFoundValueTier[] = ['low', 'medium', 'high']

interface CreateLostFoundItemInput {
  itemDescription: string
  category: LostFoundCategory
  valueTier: LostFoundValueTier
  foundLocation: string
  foundAt: string // 'YYYY-MM-DD'
  storageLocation: string
  linkedIncidentId?: string
}

/** lost-and-found-report.md §7/§10. Photo mandatory is enforced client-side (upload happens right after this call resolves, same "create then attach" order as Security Patrol) — flagging as a known gap, not silently assumed solved. */
export const createLostFoundItem = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.LOST_FOUND_CREATE)

    const input = (request.data ?? {}) as Partial<CreateLostFoundItemInput>

    if (
      !input.itemDescription ||
      !input.category ||
      !CATEGORIES.includes(input.category) ||
      !input.valueTier ||
      !VALUE_TIERS.includes(input.valueTier) ||
      !input.foundLocation ||
      !input.foundAt ||
      !input.storageLocation
    ) {
      throw new AppError(
        'invalid-argument',
        'itemDescription, category, valueTier, foundLocation, foundAt, and storageLocation are required.',
      )
    }

    const itemNumber = await allocateLostFoundItemNumber()
    const retentionExpiresAt = calculateRetentionExpiresAt(input.foundAt, input.category)

    const itemRef = db.collection(COLLECTIONS.LOST_FOUND_ITEMS).doc()
    await itemRef.set({
      itemNumber,
      itemDescription: input.itemDescription,
      category: input.category,
      valueTier: input.valueTier,
      foundLocation: input.foundLocation,
      foundAt: input.foundAt,
      foundBy: user.uid,
      storageLocation: input.storageLocation,
      linkedIncidentId: input.linkedIncidentId ?? null,
      outletId: user.outletId,
      departmentId: user.departmentId,
      retentionExpiresAt,
      retentionWarnedAt: null,
      ...newDocumentBaseFields(user.uid, 'logged'),
    })

    await recordAuditEvent({
      eventType: 'LostFoundItemLogged',
      category: 'Operations',
      module: 'operations',
      resourceType: 'lostFoundItem',
      resourceId: itemRef.id,
      action: 'create',
      user,
      newValues: { itemNumber, category: input.category, valueTier: input.valueTier },
    })

    if (input.valueTier !== 'low') {
      await Promise.all([
        notifyUsersByRole({
          role: 'outletManager',
          module: 'operations',
          title: 'Found Item Logged',
          message: `"${input.itemDescription}" (${itemNumber}, ${input.valueTier} value) logged at ${input.foundLocation}.`,
          referenceId: itemRef.id,
          priority: 'medium',
        }),
        notifyUsersByRole({
          role: 'generalManager',
          module: 'operations',
          title: 'Found Item Logged',
          message: `"${input.itemDescription}" (${itemNumber}, ${input.valueTier} value) logged at ${input.foundLocation}.`,
          referenceId: itemRef.id,
          priority: 'medium',
        }),
      ])
    }

    return successResponse({ itemId: itemRef.id, itemNumber, retentionExpiresAt }, 'Item logged.')
  } catch (error) {
    handleError(error)
  }
})
