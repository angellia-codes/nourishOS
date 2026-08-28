import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
  type AuthedUser,
} from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { PAYROLL_WRITE_CHUNK_SIZE } from '../../lib/payroll'
import {
  loadComponents,
  loadCompensationEmployeeNumbers,
  loadEmployees,
  loadExistingPayslipKeys,
  loadParameters,
  requirePeriod,
} from './context'
import { findBatchByHash } from './parsePayrollCsv'
import { validateHeader, validatePayrollRows, type PayslipDraft } from './validate'

const MAX_ROWS = 500

export interface CreatePayrollBatchInput {
  period: string
  outletId?: string | null
  sourceFileName: string
  sourceFileHash: string
  rows: Record<string, string>[]
}

/**
 * payroll-components-payslip-design.md §7 — writes the batch as `draft` plus
 * every payslip.
 *
 * The preview from parsePayrollCsv is advisory; everything is re-validated
 * here against freshly-read data, because the roster or an existing payslip
 * can change between the two calls. Any hard failure aborts the whole write:
 * §6.1 — a partially-failed import must never leave a month half-published.
 *
 * Payslips are written here but are NOT readable until the batch is approved.
 * `issuedAt` stays null until then, and firestore.rules gates the read on it.
 */
export const createPayrollBatch = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_IMPORT)

    const { period, outletId, sourceFileName, sourceFileHash, rows } = (request.data ??
      {}) as Partial<CreatePayrollBatchInput>

    const validPeriod = requirePeriod(period)
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows must be a non-empty array.')
    }
    if (rows.length > MAX_ROWS) {
      throw new AppError('invalid-argument', `A single import is limited to ${MAX_ROWS} rows.`)
    }
    if (typeof sourceFileHash !== 'string' || !sourceFileHash) {
      throw new AppError('invalid-argument', 'sourceFileHash is required.')
    }
    if (!sourceFileName) {
      throw new AppError('invalid-argument', 'sourceFileName is required.')
    }
    if (outletId && !(outletId in OUTLET_DEPARTMENTS)) {
      throw new AppError('invalid-argument', 'outletId is not a recognized outlet.')
    }

    const headerIssues = validateHeader(Object.keys(rows[0] ?? {}))
    if (headerIssues.length > 0) {
      throw new AppError('invalid-argument', headerIssues[0].message, { issues: headerIssues })
    }

    const duplicateFile = await findBatchByHash(sourceFileHash)
    if (duplicateFile) {
      throw new AppError(
        'already-exists',
        `This exact file was already imported as batch ${duplicateFile} — re-uploading it would double-pay the month.`,
      )
    }

    const { year, rates } = await loadParameters(validPeriod)
    const [components, employeesByNumber, existingPayslipKeys, compensationEmployeeNumbers] = await Promise.all([
      loadComponents(),
      loadEmployees(rows.map((row) => (row.employeeNumber ?? '').trim())),
      loadExistingPayslipKeys(validPeriod),
      loadCompensationEmployeeNumbers(),
    ])

    const result = validatePayrollRows({
      rows,
      period: validPeriod,
      parametersYear: year,
      rates,
      components,
      employeesByNumber,
      existingPayslipKeys,
      compensationEmployeeNumbers,
    })

    if (result.hardFailures.length > 0) {
      throw new AppError(
        'failed-precondition',
        `${result.hardFailures.length} row(s) failed validation. Fix the file and re-upload — no payslips were written.`,
        { hardFailures: result.hardFailures },
      )
    }

    const batchRef = db.collection(COLLECTIONS.PAYROLL_BATCHES).doc()
    await batchRef.set({
      period: validPeriod,
      outletId: outletId ?? null,
      parametersYear: year,
      rowCount: result.drafts.length,
      sourceFileName,
      sourceFileHash,
      totals: result.totals,
      reconciliation: {
        hardFailures: [],
        warnings: result.warnings,
        overriddenRows: result.overriddenRows,
      },
      approvalRequestId: null,
      ...newDocumentBaseFields(user.uid),
      // After the spread: newDocumentBaseFields defaults `status` to 'active',
      // and PayrollBatch overrides BaseDocument's status with its own
      // lifecycle, the same way Employee does.
      status: 'draft',
    })

    await writePayslips(batchRef.id, validPeriod, year, result.drafts, user)

    await recordAuditEvent({
      eventType: 'PayrollBatchCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'payrollBatch',
      resourceId: batchRef.id,
      action: 'create',
      user,
      newValues: {
        period: validPeriod,
        rowCount: result.drafts.length,
        sourceFileName,
        totals: result.totals,
        // §12 — the override reason and its variance are part of the record an
        // audit needs to see, not a UI-only annotation.
        overriddenRows: result.overriddenRows,
        overrideReasons: result.drafts
          .filter((draft) => draft.statutoryOverrideReason)
          .map((draft) => ({
            employeeNumber: draft.employee.employeeNumber,
            reason: draft.statutoryOverrideReason,
          })),
      },
    })

    return successResponse(
      { batchId: batchRef.id, rowCount: result.drafts.length, warnings: result.warnings },
      `Batch created with ${result.drafts.length} payslip(s). Submit it for approval to publish.`,
    )
  } catch (error) {
    handleError(error)
  }
})

/**
 * §6.5 — chunked at 400 documents per writeBatch. Forty staff is comfortably
 * inside one chunk today, but the unbounded-batch pattern that affects
 * markAllNotificationsRead must not be reproduced here.
 */
export async function writePayslips(
  batchId: string,
  period: string,
  parametersYear: number,
  drafts: PayslipDraft[],
  user: AuthedUser,
): Promise<string[]> {
  const payslipIds: string[] = []

  for (let offset = 0; offset < drafts.length; offset += PAYROLL_WRITE_CHUNK_SIZE) {
    const chunk = drafts.slice(offset, offset + PAYROLL_WRITE_CHUNK_SIZE)
    const writeBatch = db.batch()

    for (const draft of chunk) {
      const ref = db.collection(COLLECTIONS.PAYSLIPS).doc()
      payslipIds.push(ref.id)
      writeBatch.set(ref, {
        batchId,
        period,
        employeeId: draft.employee.employeeId,
        employeeUid: draft.employee.employeeUid,
        employeeNumber: draft.employee.employeeNumber,
        legacyEmployeeId: draft.employee.legacyEmployeeId,
        fullName: draft.employee.fullName,
        outletId: draft.employee.outletId,
        outletName: draft.employee.outletName,
        position: draft.employee.position,
        taxStatus: draft.employee.taxStatus,
        lineItems: draft.lineItems,
        totalIncome: draft.totalIncome,
        totalDeduction: draft.totalDeduction,
        takeHomePay: draft.takeHomePay,
        totalEmployerCost: draft.totalEmployerCost,
        parametersYear,
        statutoryOverrideReason: draft.statutoryOverrideReason,
        // Both stamped only when the batch is approved. `isIssued` is what
        // firestore.rules actually reads: a list query can prove an equality
        // filter, where it cannot prove `issuedAt != null`.
        issuedAt: null,
        isIssued: false,
        supersedesPayslipId: null,
        supersededByPayslipId: null,
        ...newDocumentBaseFields(user.uid),
      })
    }

    await writeBatch.commit()
  }

  return payslipIds
}
