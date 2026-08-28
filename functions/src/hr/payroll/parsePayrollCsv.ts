import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  loadComponents,
  loadCompensationEmployeeNumbers,
  loadEmployees,
  loadExistingPayslipKeys,
  loadParameters,
  requirePeriod,
} from './context'
import { validateHeader, validatePayrollRows, type ValidationIssue } from './validate'

/** §6.1 — 40 staff today; the cap is a guardrail, not a target. */
const MAX_ROWS = 500

export interface ParsePayrollCsvInput {
  period: string
  sourceFileName: string
  sourceFileHash: string
  /** Header-keyed rows, parsed client-side by src/utils/csv.ts's parseCsv. */
  rows: Record<string, string>[]
}

/**
 * payroll-components-payslip-design.md §7 — parse, resolve, validate, return
 * the reconciliation report. **Writes nothing.** The report is advisory: it
 * exists so HR sees what will happen before it happens, and createPayrollBatch
 * re-derives all of it server-side rather than trusting what came back here.
 */
export const parsePayrollCsv = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PAYROLL_IMPORT)

    const { period, sourceFileName, sourceFileHash, rows } = (request.data ?? {}) as Partial<ParsePayrollCsvInput>

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

    const headerIssues = validateHeader(Object.keys(rows[0] ?? {}))
    // Schema drift makes every downstream check meaningless — stop here rather
    // than reporting forty rows of noise caused by one wrong template.
    if (headerIssues.length > 0) {
      return successResponse(
        emptyReport(validPeriod, rows.length, headerIssues),
        'The file does not match the payroll template.',
      )
    }

    const duplicateFile = await findBatchByHash(sourceFileHash)
    const fileIssues: ValidationIssue[] = duplicateFile
      ? [
          {
            severity: 'hardFailure',
            row: 0,
            employeeNumber: '',
            code: 'duplicateFile',
            message: `This exact file was already imported as batch ${duplicateFile} — re-uploading it would double-pay the month.`,
          },
        ]
      : []

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

    const hardFailures = [...fileIssues, ...result.hardFailures]

    return successResponse(
      {
        period: validPeriod,
        parametersYear: year,
        rowCount: rows.length,
        sourceFileName: sourceFileName ?? '',
        hardFailures,
        warnings: result.warnings,
        overriddenRows: result.overriddenRows,
        totals: result.totals,
      },
      hardFailures.length === 0
        ? `${result.drafts.length} row(s) ready to import.`
        : `${hardFailures.length} row(s) must be fixed before this batch can be created.`,
    )
  } catch (error) {
    handleError(error)
  }
})

/** §6.2 — the same file twice is the same month twice. */
export async function findBatchByHash(sourceFileHash: string): Promise<string | null> {
  const snap = await db
    .collection(COLLECTIONS.PAYROLL_BATCHES)
    .where('sourceFileHash', '==', sourceFileHash)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}

function emptyReport(period: string, rowCount: number, hardFailures: ValidationIssue[]) {
  return {
    period,
    parametersYear: Number(period.slice(0, 4)),
    rowCount,
    sourceFileName: '',
    hardFailures,
    warnings: [],
    overriddenRows: [],
    totals: { totalIncome: 0, totalDeduction: 0, totalTakeHomePay: 0, totalEmployerCost: 0 },
  }
}
