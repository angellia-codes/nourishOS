import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  checklistItemsFor,
  type ChecklistType,
} from '../../lib'

interface SaveChecklistProgressInput {
  type: ChecklistType
  itemId: string
  completed: boolean
}

const COLLECTION_FOR_TYPE: Record<ChecklistType, string> = {
  opening: COLLECTIONS.OPENING_CHECKLISTS,
  closing: COLLECTIONS.CLOSING_CHECKLISTS,
}

/**
 * FEATURE_SPECIFICATIONS.md Module 5 — Opening/Closing Checklists. One doc
 * per outlet+day (deterministic id, no query/index needed), item completion
 * toggled one at a time as staff work through the list. Photo attachments
 * reuse the existing files/resourceType/resourceId convention client-side —
 * no server code needed for that part.
 */
export const saveChecklistProgress = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHECKLISTS_RECORD)

    const input = (request.data ?? {}) as Partial<SaveChecklistProgressInput>
    if (input.type !== 'opening' && input.type !== 'closing') {
      throw new AppError('invalid-argument', 'type must be "opening" or "closing".')
    }
    if (!input.itemId || !checklistItemsFor(input.type).some((item) => item.id === input.itemId)) {
      throw new AppError('invalid-argument', 'Unknown checklist item.')
    }
    if (typeof input.completed !== 'boolean') {
      throw new AppError('invalid-argument', 'completed must be a boolean.')
    }
    if (!user.outletId) {
      throw new AppError('failed-precondition', 'Your account has no outlet assigned.')
    }

    const date = todayIso()
    const docId = `${user.outletId}__${date}`
    const ref = db.collection(COLLECTION_FOR_TYPE[input.type]).doc(docId)
    const snap = await ref.get()
    if (!snap.exists) {
      await ref.set({
        outletId: user.outletId,
        type: input.type,
        date,
        itemStatuses: {},
        ...newDocumentBaseFields(user.uid),
      })
    }

    await ref.update({
      [`itemStatuses.${input.itemId}`]: {
        completed: input.completed,
        completedBy: user.uid,
        completedAt: FieldValue.serverTimestamp(),
      },
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ChecklistItemUpdated',
      category: 'Operations',
      module: 'operations',
      resourceType: input.type === 'opening' ? 'openingChecklist' : 'closingChecklist',
      resourceId: docId,
      action: 'update',
      user,
      newValues: { itemId: input.itemId, completed: input.completed },
    })

    return successResponse({ checklistId: docId }, 'Checklist updated.')
  } catch (error) {
    return handleError(error)
  }
})
