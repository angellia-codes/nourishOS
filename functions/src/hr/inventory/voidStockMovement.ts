import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { loadMovementLegsInTransaction, applyLevelDeltas, type LevelDelta } from './helpers'

interface VoidStockMovementInput {
  movementId: string
  reason: string
}

/**
 * Corrects a mis-keyed ledger entry by reversing its stock effect and marking
 * the row voided — never by deleting it. The movement doc survives with
 * isVoided/voidedBy/voidReason so the audit trail still shows what was
 * entered and who withdrew it (the same soft-delete reasoning deleteFile
 * uses); every reader filters voided rows out instead.
 *
 * Gated on hrInventory.manage rather than hrInventory.record: recording a
 * movement is a daily outlet-leader act, withdrawing one is item-master
 * curation, which is hrManager (and superAdmin, which bypasses) only.
 *
 * A paired transfer voids both legs together — reversing only the transferOut
 * would leave stock double-counted at the destination outlet.
 */
export const voidStockMovement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.HR_INVENTORY_MANAGE)

    const input = (request.data ?? {}) as Partial<VoidStockMovementInput>
    const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
    if (!reason) {
      throw new AppError('invalid-argument', 'reason is required to void a movement.')
    }

    const voidedIds: string[] = []
    let itemId = ''

    await db.runTransaction(async (tx) => {
      voidedIds.length = 0
      const legs = await loadMovementLegsInTransaction(tx, input.movementId)
      itemId = (legs[0].data.itemId as string) ?? ''

      const deltas: LevelDelta[] = legs.map((leg) => ({
        itemId: leg.data.itemId as string,
        outletId: leg.data.outletId as string,
        sizeVariant: (leg.data.sizeVariant as string | null) ?? null,
        delta: -((leg.data.quantityDelta as number) ?? 0),
      }))

      // Throws failed-precondition before any write if reversing would take a
      // level negative — e.g. voiding a transferIn whose stock has since been
      // issued onward from the destination outlet.
      await applyLevelDeltas(tx, deltas, user.uid)

      for (const leg of legs) {
        tx.update(leg.ref, {
          isVoided: true,
          voidedAt: FieldValue.serverTimestamp(),
          voidedBy: user.uid,
          voidReason: reason,
          ...updatedFields(user.uid),
        })
        voidedIds.push(leg.ref.id)
      }
    })

    await recordAuditEvent({
      eventType: 'StockMovementVoided',
      category: 'HR',
      module: 'hr',
      resourceType: 'stockMovement',
      resourceId: input.movementId as string,
      action: 'update',
      user,
      newValues: { itemId, voidedMovementIds: voidedIds, reason },
    })

    return successResponse({ voidedMovementIds: voidedIds }, 'Movement voided and stock reversed.')
  } catch (error) {
    handleError(error)
  }
})
