import { onCall } from 'firebase-functions/v2/https'
import {
  REGION,
  requireActiveUser,
  requirePermission,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  daysInMonth,
  loadActiveEmployeeNumbers,
  loadEmployeesByNumber,
  loadPreviousPeriodTotals,
  outletIdByDisplayName,
  requirePeriod,
} from './context'
import { checkAndFoldHeader, validateAttendanceRows, type AttendanceValidationIssue } from './validate'

const MAX_ROWS = 500

export interface PreviewAttendanceImportInput {
  period: string
  sourceFileName: string
  rows: Record<string, string>[]
}

/**
 * attendance.md §5 — parse, resolve, validate, return the reconciliation
 * report. **Writes nothing.** `importAttendancePeriod` re-derives all of this
 * server-side rather than trusting what came back here — mirrors
 * functions/src/hr/payroll/parsePayrollCsv.ts.
 */
export const previewAttendanceImport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.ATTENDANCE_IMPORT)

    const { period, sourceFileName, rows } = (request.data ?? {}) as Partial<PreviewAttendanceImportInput>
    const validPeriod = requirePeriod(period)

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows must be a non-empty array.') // V9
    }
    if (rows.length > MAX_ROWS) {
      throw new AppError('invalid-argument', `A single import is limited to ${MAX_ROWS} rows.`)
    }

    const header = Object.keys(rows[0] ?? {})
    const { hardFailures: headerFailures, rows: foldedRows, substitutions } = checkAndFoldHeader(header, rows)

    if (headerFailures.length > 0) {
      return successResponse(
        emptyReport(validPeriod, rows.length, sourceFileName ?? '', headerFailures),
        'The file does not match the attendance template.',
      )
    }

    const [employeesByNumber, activeEmployeeNumbers, previousTotals] = await Promise.all([
      loadEmployeesByNumber(foldedRows.map((row) => (row.employee_number ?? '').trim())),
      loadActiveEmployeeNumbers(),
      loadPreviousPeriodTotals(validPeriod),
    ])

    const result = validateAttendanceRows({
      rows: foldedRows,
      originalRows: rows,
      daysInMonth: daysInMonth(validPeriod),
      employeesByNumber,
      outletIdByName: outletIdByDisplayName(),
      activeEmployeeNumbers,
    })

    const aliasWarnings: AttendanceValidationIssue[] = substitutions.map((substitution) => ({
      severity: 'warning',
      row: 0,
      employeeNumber: '',
      code: 'legacyCodeFolded',
      message: `Legacy column folded: ${substitution} (W6).`,
    }))

    return successResponse(
      {
        period: validPeriod,
        daysInMonth: daysInMonth(validPeriod),
        rowCount: rows.length,
        sourceFileName: sourceFileName ?? '',
        hardFailures: result.hardFailures,
        warnings: [...aliasWarnings, ...result.warnings],
        aliasSubstitutions: substitutions,
        totals: result.totals,
        previousTotals,
      },
      result.hardFailures.length === 0
        ? `${result.records.length} row(s) ready to import.`
        : `${result.hardFailures.length} row(s) must be fixed before this period can be created.`,
    )
  } catch (error) {
    return handleError(error)
  }
})

function emptyReport(
  period: string,
  rowCount: number,
  sourceFileName: string,
  hardFailures: AttendanceValidationIssue[],
) {
  return {
    period,
    daysInMonth: daysInMonth(period),
    rowCount,
    sourceFileName,
    hardFailures,
    warnings: [],
    aliasSubstitutions: [],
    totals: { headcount: 0, totalWD: 0, totalEntitledLeave: 0, totalUL: 0, totalLateIncidents: 0 },
    previousTotals: null,
  }
}
