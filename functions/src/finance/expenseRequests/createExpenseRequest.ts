import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { allocateExpenseRequestNumber, validateItems, EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseItemInput } from './helpers'

interface CreateExpenseRequestInput {
  purpose: string
  category: ExpenseCategory
  costCenterId?: string
  expenseDate: string // ISO date (YYYY-MM-DD), cannot be in the future
  items: ExpenseItemInput[]
}

// expense-request.md §7 — draft creation is owner-scoped (no dedicated
// permission; only submit gates on EXPENSE_REQUESTS_SUBMIT). Validates items
// and date up front (AC-1, AC-2); receipts are uploaded to the `files`
// collection against the returned id (create-then-attach) and their presence
// is enforced at submit — the repo convention of querying `files` by
// resourceType/resourceId rather than an inline array (FILE_STORAGE.md §15).
export const createExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const input = (request.data ?? {}) as Partial<CreateExpenseRequestInput>

    if (!input.purpose || typeof input.purpose !== 'string') {
      throw new AppError('invalid-argument', 'purpose is required.')
    }
    if (!input.category || !EXPENSE_CATEGORIES.includes(input.category)) {
      throw new AppError('invalid-argument', 'A valid category is required.')
    }
    if (!input.expenseDate || typeof input.expenseDate !== 'string') {
      throw new AppError('invalid-argument', 'expenseDate is required.')
    }
    const today = new Date().toISOString().slice(0, 10)
    if (input.expenseDate > today) {
      throw new AppError('invalid-argument', 'expenseDate cannot be in the future.')
    }

    // Throws AppError on any invalid item; total is computed, never trusted.
    const { items, totalAmount } = validateItems(input.items)

    const requestNumber = await allocateExpenseRequestNumber()
    const requestRef = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc()
    await requestRef.set({
      requestNumber,
      requestedBy: user.uid,
      purpose: input.purpose.trim(),
      category: input.category,
      costCenterId: input.costCenterId ?? null,
      expenseDate: input.expenseDate,
      items,
      totalAmount,
      approvalRequestId: null,
      outletId: user.outletId,
      departmentId: user.departmentId,
      paidAt: null,
      paidBy: null,
      paymentReference: null,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestCreated',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: requestRef.id,
      action: 'create',
      user,
      newValues: { requestNumber, totalAmount, category: input.category },
    })

    return successResponse({ expenseRequestId: requestRef.id, requestNumber }, 'Expense request draft created.')
  } catch (error) {
    handleError(error)
  }
})
