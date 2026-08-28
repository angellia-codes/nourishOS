import { onCall } from 'firebase-functions/v2/https'
import {
  REGION,
  PERMISSIONS,
  requireActiveUser,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { submitApprovalInternal } from '../shared/approval'
import {
  allocateExpenseNumber,
  countReceipts,
  loadExpenseRequest,
  normaliseItems,
  requireExpensePermission,
} from './helpers'

/**
 * expense-request.md §7. The one call in this module that does anything
 * interesting, and the guards are §10's acceptance criteria in order: at least
 * one item, at least one receipt, an expense date not in the future, and a total
 * the server computed rather than one the client sent.
 *
 * The last of those is load-bearing beyond validation. `totalAmount` is what
 * decides how long the approval chain is (§3), so a client that could name its
 * own total could route a 50,000,000 request through a 5,000,000 chain. The
 * context handed to the Approval Engine is built here, from the stored items.
 */
export const submitExpenseRequest = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireExpensePermission(user, PERMISSIONS.EXPENSE_REQUESTS_SUBMIT)

    const { expenseRequestId } = (request.data ?? {}) as { expenseRequestId?: string }
    const { ref, data: expense } = await loadExpenseRequest(expenseRequestId)

    if (expense.requestedBy !== user.uid) {
      throw new AppError('permission-denied', 'Only the requester can submit this expense request.')
    }
    if (expense.status !== 'draft') {
      throw new AppError('failed-precondition', `This request has already been submitted (${expense.status}).`)
    }

    // Re-derived from the stored items rather than read off the document, so a
    // totalAmount written by an older version of the shape can't route this.
    const { items, totalAmount } = normaliseItems(expense.items ?? [])
    if (items.length === 0) {
      throw new AppError('failed-precondition', 'Add at least one expense item before submitting.')
    }

    const receiptCount = await countReceipts(ref.id)
    if (receiptCount === 0) {
      const message =
        expense.paymentCategory === 'cashAdvance'
          ? 'Attach a quotation or a photo of the item before submitting.'
          : 'Attach an invoice before submitting.'
      throw new AppError('failed-precondition', message)
    }

    const requestNumber = (expense.requestNumber as string | null) ?? (await allocateExpenseNumber())

    // The route is server-owned (shared/approval/routes.ts, 'finance/expenseRequest')
    // and conditional on this context; notifying the first approver happens
    // inside submitApprovalInternal.
    const approvalRequestId = await submitApprovalInternal({
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      requestedBy: user.uid,
      context: {
        totalAmount,
        departmentId: expense.departmentId ?? user.departmentId,
        outletId: expense.outletId ?? user.outletId,
        requesterRoleId: user.roleId,
      },
    })

    await ref.update({
      requestNumber,
      totalAmount,
      status: 'pendingApproval',
      approvalRequestId,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ExpenseRequestSubmitted',
      category: 'Finance',
      module: 'finance',
      resourceType: 'expenseRequest',
      resourceId: ref.id,
      action: 'submit',
      user,
      newValues: { requestNumber, totalAmount, approvalRequestId },
    })

    return successResponse({ expenseRequestId: ref.id, requestNumber, totalAmount }, `${requestNumber} submitted for approval.`)
  } catch (error) {
    return handleError(error)
  }
})
