import { onCall } from 'firebase-functions/v2/https'
import { REGION, requireActiveUser, recordAuditEvent, updatedFields, AppError, handleError, successResponse } from '../lib'
import {
  loadExpenseRequest,
  normaliseItems,
  validateCategory,
  validateExpenseDate,
  validateNotes,
  validatePurpose,
} from './helpers'

/**
 * expense-request.md §7 — draft-only edits, owner only. Once submitted the
 * document is the thing approvers are looking at, so changing it underneath them
 * would invalidate a decision already made; the requester withdraws through the
 * Approval Engine's own cancelApproval instead.
 */
export const updateExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const input = (request.data ?? {}) as Record<string, unknown>
    const { ref, data: previous } = await loadExpenseRequest(input.expenseRequestId)

    if (previous.requestedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the requester can edit this expense request.')
    }
    if (previous.status !== 'draft') {
      throw new AppError('failed-precondition', `This request is already ${previous.status} and can no longer be edited.`)
    }

    const purpose = validatePurpose(input.purpose)
    const category = validateCategory(input.category)
    const expenseDate = validateExpenseDate(input.expenseDate)
    const notes = validateNotes(input.notes)
    const { items, totalAmount } = normaliseItems(input.items ?? [])
    const costCenterId = typeof input.costCenterId === 'string' ? input.costCenterId.trim() || null : null

    await ref.update({
      purpose,
      category,
      costCenterId,
      expenseDate,
      notes,
      items,
      totalAmount,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestUpdated',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      action: 'update',
      user,
      previousValues: {
        purpose: previous.purpose,
        category: previous.category,
        expenseDate: previous.expenseDate,
        totalAmount: previous.totalAmount,
      },
      newValues: { purpose, category, expenseDate, totalAmount, itemCount: items.length },
    })

    return successResponse({ expenseRequestId: ref.id, totalAmount }, 'Draft updated.')
  } catch (error) {
    return handleError(error)
  }
})
