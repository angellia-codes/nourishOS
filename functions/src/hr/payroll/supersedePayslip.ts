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
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { loadComponents, loadParameters } from './context'
import { expandLineItems, sumEmployerCost, sumSide, type DiscretionaryInput } from './statutory'
import { STATUTORY_COMPONENTS } from '../../lib/payroll'

export interface SupersedePayslipInput {
  payslipId: string
  /** Corrected amounts keyed by component id — every component of the slip. */
  amounts: Record<string, number>
  reason: string
}

/**
 * payroll-components-payslip-design.md §11 — a correction issues a NEW payslip
 * with `supersedesPayslipId`; the original gains `supersededByPayslipId` and
 * renders with a superseded marker.
 *
 * Recomputing in place is explicitly forbidden: it would destroy the record
 * that an error occurred, which is precisely what an audit needs to see.
 *
 * The replacement is issued immediately (`issuedAt` set) rather than routed
 * through a fresh approval chain — the batch it belongs to is already
 * approved, and a correction that stayed unreadable would leave the employee
 * with a slip everyone knows is wrong and no replacement to hand them.
 */
export const supersedePayslip = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_IMPORT)

    const { payslipId, amounts, reason } = (request.data ?? {}) as Partial<SupersedePayslipInput>
    if (!payslipId) {
      throw new AppError('invalid-argument', 'payslipId is required.')
    }
    if (!amounts || typeof amounts !== 'object') {
      throw new AppError('invalid-argument', 'amounts is required.')
    }
    const trimmedReason = (reason ?? '').trim()
    if (!trimmedReason) {
      throw new AppError('invalid-argument', 'A reason for the correction is required.')
    }

    const originalRef = db.collection(COLLECTIONS.PAYSLIPS).doc(payslipId)
    const originalSnap = await originalRef.get()
    if (!originalSnap.exists) {
      throw new AppError('not-found', 'Payslip not found.')
    }
    const original = originalSnap.data()!

    if (!original.issuedAt) {
      throw new AppError(
        'failed-precondition',
        'This payslip has not been issued yet — correct the batch and re-import instead of superseding.',
      )
    }
    if (original.supersededByPayslipId) {
      throw new AppError('failed-precondition', 'This payslip has already been superseded.')
    }

    const { year, rates } = await loadParameters(original.period as string)
    const components = await loadComponents()

    const discretionary: DiscretionaryInput[] = components.map((component) => ({
      code: component.code,
      labelId: component.labelId,
      labelEn: component.labelEn,
      type: component.type,
      sortOrder: component.sortOrder,
      amount: numberOf(amounts, component.code),
    }))

    const statutoryAmounts: Record<string, number> = {}
    for (const componentId of Object.keys(STATUTORY_COMPONENTS)) {
      statutoryAmounts[componentId] = numberOf(amounts, componentId)
    }

    const basicSalary = discretionary.find((c) => c.code === 'BASIC_SALARY')?.amount ?? 0
    const lineItems = expandLineItems(discretionary, statutoryAmounts, rates, basicSalary)
    const totalIncome = sumSide(lineItems, 'income')
    const totalDeduction = sumSide(lineItems, 'deduction')
    const takeHomePay = totalIncome - totalDeduction
    if (takeHomePay < 0) {
      throw new AppError('invalid-argument', 'Take home pay would be negative — check the corrected amounts.')
    }

    const replacementRef = db.collection(COLLECTIONS.PAYSLIPS).doc()

    const writeBatch = db.batch()
    writeBatch.set(replacementRef, {
      batchId: original.batchId,
      period: original.period,
      employeeId: original.employeeId,
      employeeUid: original.employeeUid ?? null,
      employeeNumber: original.employeeNumber,
      legacyEmployeeId: original.legacyEmployeeId ?? null,
      fullName: original.fullName,
      outletId: original.outletId,
      outletName: original.outletName,
      position: original.position,
      taxStatus: original.taxStatus ?? null,
      lineItems,
      totalIncome,
      totalDeduction,
      takeHomePay,
      totalEmployerCost: sumEmployerCost(lineItems),
      parametersYear: year,
      statutoryOverrideReason: trimmedReason,
      issuedAt: FieldValue.serverTimestamp(),
      isIssued: true,
      supersedesPayslipId: payslipId,
      supersededByPayslipId: null,
      ...newDocumentBaseFields(user.uid),
    })
    writeBatch.update(originalRef, {
      supersededByPayslipId: replacementRef.id,
      ...updatedFields(user.uid),
    })
    await writeBatch.commit()

    await recordAuditEvent({
      eventType: 'PayslipSuperseded',
      category: 'HR',
      module: 'hr',
      resourceType: 'payslip',
      resourceId: payslipId,
      action: 'update',
      user,
      previousValues: { takeHomePay: original.takeHomePay, totalIncome: original.totalIncome },
      newValues: { replacementPayslipId: replacementRef.id, takeHomePay, totalIncome, reason: trimmedReason },
    })

    return successResponse({ payslipId: replacementRef.id }, 'Correction issued.')
  } catch (error) {
    handleError(error)
  }
})

function numberOf(amounts: Record<string, unknown>, key: string): number {
  const raw = amounts[key]
  if (raw === undefined || raw === null || raw === '') return 0
  const value = typeof raw === 'string' ? Number(raw) : (raw as number)
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new AppError('invalid-argument', `Amount for "${key}" must be a non-negative number.`)
  }
  return value
}
