import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { requirePeriodMonth, requireNonNegativeNumber } from './helpers'

/** Mirrors src/features/hr/payroll/revenueService.ts's ALL_OUTLETS_ID — a company-wide total entered as one figure instead of nine per-outlet ones, not a real outlet. */
const ALL_OUTLETS_ID = 'all'

/**
 * Manual monthly revenue entry — no POS integration exists anywhere in this
 * app, so this is the only source. Deterministic doc id
 * (`${outletId}_${periodMonth}`) — re-entering a period corrects it via
 * full-overwrite, same precedent as updateEmployeeCompensation's "current" doc.
 */
export const recordMonthlyRevenue = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.REPORTS_CREATE)

    const { outletId, periodMonth, amount } = (request.data ?? {}) as {
      outletId?: string
      periodMonth?: string
      amount?: number
    }
    if (!outletId || (outletId !== ALL_OUTLETS_ID && !(outletId in OUTLET_DEPARTMENTS))) {
      throw new AppError('invalid-argument', 'outletId is not a recognized outlet.')
    }
    const validPeriodMonth = requirePeriodMonth(periodMonth)
    const validAmount = requireNonNegativeNumber(amount, 'amount')

    const recordId = `${outletId}_${validPeriodMonth}`
    await db
      .collection(COLLECTIONS.MONTHLY_REVENUE)
      .doc(recordId)
      .set({
        outletId,
        periodMonth: validPeriodMonth,
        amount: validAmount,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      })

    await recordAuditEvent({
      eventType: 'MonthlyRevenueRecorded',
      category: 'HR',
      module: 'hr',
      resourceType: 'monthlyRevenue',
      resourceId: recordId,
      action: 'update',
      user,
      newValues: { outletId, periodMonth: validPeriodMonth, amount: validAmount },
    })

    return successResponse(undefined, 'Revenue recorded.')
  } catch (error) {
    handleError(error)
  }
})
