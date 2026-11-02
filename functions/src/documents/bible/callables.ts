import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { resolveBibleAccess, type BibleAccessEmployee } from './access'
import { BIBLE_OUTLETS, type BibleEditionBody } from './edition'

/** systemSettings/bibleEdition — the pointer at the live edition (§6.1). */
export const BIBLE_EDITION_POINTER_ID = 'bibleEdition'

/**
 * nourish-bible.md §6.4 — what the signed-in user may open. A display aid:
 * the client hides pages from it, nothing more. Phase 3's getBibleRecipe is
 * the enforcement point for recipes.
 */
export const getBibleAccess = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    let employee: BibleAccessEmployee | null = null
    if (user.employeeId) {
      const snap = await db.collection(COLLECTIONS.EMPLOYEES).doc(user.employeeId).get()
      employee = snap.exists ? (snap.data() as BibleAccessEmployee) : null
    }
    return successResponse(resolveBibleAccess(user, employee))
  } catch (error) {
    return handleError(error)
  }
})

/**
 * nourish-bible.md §6.2 / D11 — an outlet manager ticks what their outlet
 * sells. No approval (§18 deviation); logged instead. Prices are not set here —
 * overrides need approval and arrive with Phase 2.
 */
export const setBibleOutletMenu = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.BIBLE_MANAGE_OUTLET_MENU)

    const { outletId, soldItemIds } = (request.data ?? {}) as { outletId?: unknown; soldItemIds?: unknown }
    if (typeof outletId !== 'string' || !(BIBLE_OUTLETS as readonly string[]).includes(outletId)) {
      throw new AppError('invalid-argument', 'Choose one of the three restaurant outlets.')
    }
    if (user.roleId !== 'superAdmin' && user.outletId !== outletId) {
      throw new AppError('permission-denied', 'You can only change the menu for your own outlet.')
    }
    if (!Array.isArray(soldItemIds) || soldItemIds.some((id) => typeof id !== 'string')) {
      throw new AppError('invalid-argument', 'soldItemIds must be a list of item ids.')
    }
    const requested = [...new Set(soldItemIds as string[])]

    const pointer = await db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(BIBLE_EDITION_POINTER_ID).get()
    const editionId = pointer.get('currentEditionId') as string | undefined
    if (!editionId) throw new AppError('failed-precondition', 'The menu has not been published yet.')
    const edition = await db.collection(COLLECTIONS.BIBLE_EDITIONS).doc(editionId).get()
    const known = new Set(((edition.data() as BibleEditionBody | undefined)?.items ?? []).map((item) => item.id))
    const unknown = requested.filter((id) => !known.has(id))
    if (unknown.length > 0) {
      throw new AppError('invalid-argument', `Not on the current menu: ${unknown.slice(0, 5).join(', ')}`, { unknown })
    }

    const ref = db.collection(COLLECTIONS.BIBLE_OUTLET_MENUS).doc(outletId)
    const before = await ref.get()
    const previous = new Set((before.get('soldItemIds') as string[] | undefined) ?? [])
    const added = requested.filter((id) => !previous.has(id))
    const removed = [...previous].filter((id) => !requested.includes(id))

    await ref.set(
      before.exists
        ? { soldItemIds: requested, ...updatedFields(user.uid) }
        : { soldItemIds: requested, priceOverrides: {}, ...newDocumentBaseFields(user.uid) },
      { merge: true },
    )

    await recordAuditEvent({
      eventType: 'BibleOutletMenuChanged',
      category: 'Documents',
      module: 'documents',
      resourceType: 'bibleOutletMenu',
      resourceId: outletId,
      action: 'update',
      user,
      metadata: { added, removed },
    })
    return successResponse({ outletId, added: added.length, removed: removed.length }, 'Outlet menu saved.')
  } catch (error) {
    return handleError(error)
  }
})
