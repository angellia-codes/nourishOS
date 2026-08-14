import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  handleError,
  successResponse,
} from '../lib'
import { normaliseItems, validateCategory, validateExpenseDate, validateNotes, validatePurpose } from './helpers'

/**
 * expense-request.md §7 — draft only, and deliberately not behind a permission
 * string: anyone active may write down what they spent. `expenseRequests.submit`
 * is what gates actually asking for the money.
 *
 * Items are embedded on this document rather than split into an `expenseItems`
 * collection (§5): they are always read and written together, and computing
 * `totalAmount` from the array here is what makes "total equals the sum of
 * items" true by construction rather than by a second validation rule.
 */
export const createExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const input = (request.data ?? {}) as Record<string, unknown>
    const purpose = validatePurpose(input.purpose)
    const category = validateCategory(input.category)
    const expenseDate = validateExpenseDate(input.expenseDate)
    const notes = validateNotes(input.notes)
    const { items, totalAmount } = normaliseItems(input.items ?? [])

    const costCenterId = typeof input.costCenterId === 'string' ? input.costCenterId.trim() || null : null

    const ref = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc()
    await ref.set({
      requestNumber: null, // allocated at submit — see submitExpenseRequest
      requestedBy: user.uid,
      purpose,
      category,
      costCenterId,
      expenseDate,
      notes,
      items,
      totalAmount,
      approvalRequestId: null,
      approvedAt: null,
      paidAt: null,
      paidBy: null,
      paymentReference: null,
      // Copied off the caller, never from input — the same rule
      // createIncidentReport follows.
      outletId: user.outletId,
      departmentId: user.departmentId,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestCreated',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { purpose, category, expenseDate, totalAmount, itemCount: items.length },
    })

    return successResponse({ expenseRequestId: ref.id, totalAmount }, 'Draft saved. Attach a receipt, then submit.')
  } catch (error) {
    return handleError(error)
  }
})
