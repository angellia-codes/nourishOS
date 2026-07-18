import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
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
import { submitApprovalInternal } from '../../shared/approval'

// expense-request.md §3/§7 — submit builds no steps of its own: the route
// (amount-thresholded, outletManager → finance [→ GM → director]) is
// server-owned in shared/approval/routes.ts. The caller only supplies the
// amount as context (AC-3).
export const submitExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EXPENSE_REQUESTS_SUBMIT)

    const { expenseRequestId } = (request.data ?? {}) as { expenseRequestId?: string }
    if (!expenseRequestId) {
      throw new AppError('invalid-argument', 'expenseRequestId is required.')
    }

    const requestRef = db.collection(COLLECTIONS.EXPENSE_REQUESTS).doc(expenseRequestId)
    const snap = await requestRef.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'Expense request not found.')
    }
    const expense = snap.data()!

    if (expense.requestedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the requester can submit this expense request.')
    }
    if (expense.status !== 'draft' && expense.status !== 'returnedForRevision') {
      throw new AppError('failed-precondition', `This expense request is already ${expense.status}.`)
    }
    if (!Array.isArray(expense.items) || expense.items.length === 0) {
      throw new AppError('failed-precondition', 'Cannot submit without at least one expense item.')
    }
    // Receipt is mandatory (AC-1). Receipts live in the `files` collection
    // (queried by resourceType/resourceId, the repo convention) rather than an
    // inline array, so verify at least one available receipt is attached.
    const receiptSnap = await db
      .collection(COLLECTIONS.FILES)
      .where('resourceType', '==', 'expenseRequest')
      .where('resourceId', '==', expenseRequestId)
      .where('fileStatus', '==', 'available')
      .limit(1)
      .get()
    if (receiptSnap.empty) {
      throw new AppError('failed-precondition', 'Cannot submit without at least one receipt attachment.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: expenseRequestId,
      requestedBy: user.uid,
      context: { amount: expense.totalAmount, outletId: expense.outletId, departmentId: expense.departmentId },
    })

    await requestRef.update({
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestSubmitted',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: expenseRequestId,
      action: 'submit',
      user,
      newValues: { totalAmount: expense.totalAmount, approvalRequestId },
    })

    return successResponse({ approvalRequestId }, 'Expense request submitted for approval.')
  } catch (error) {
    handleError(error)
  }
})
