import { ATTENDANCE_CODES, ATTENDANCE_CSV_COLUMNS, ATTENDANCE_ALIAS_COLUMNS, foldAliasColumns } from './codes'

/**
 * CSV validation — attendance.md §5. Pure: no Firestore, no auth. Every
 * lookup it needs (employees, outlet name reversal, the active roster) is
 * passed in, so the same function backs both `previewAttendanceImport`'s
 * advisory preview and `importAttendancePeriod`'s server-side gate — mirrors
 * functions/src/hr/payroll/validate.ts's split exactly.
 */

export type AttendanceValidationSeverity = 'hardFailure' | 'warning'

export interface AttendanceValidationIssue {
  severity: AttendanceValidationSeverity
  /** 1-based CSV data row; 0 for file/header-level issues. */
  row: number
  employeeNumber: string
  code: string
  message: string
}

export interface ResolvedAttendanceEmployee {
  employeeId: string
  employeeNumber: string
  fullName: string
  outletId: string
  employmentStatus: string
  status: string
}

export interface AttendanceRecordDraft {
  employeeId: string
  employeeNumber: string
  employeeNameSnapshot: string
  departmentSnapshot: string
  outletIdSnapshot: string
  employmentStatusSnapshot: string
  days: Record<string, number>
  rawCodesSeen: string[]
  lateCount: number
  totalDays: number
}

export interface AttendanceAggregateTotals {
  headcount: number
  totalWD: number
  totalEntitledLeave: number
  totalUL: number
  totalLateIncidents: number
}

/**
 * §4.1 — exact match, OR (§V6) a header that differs from canonical only by
 * carrying recognised alias columns (§2.2). Any other deviation is a hard V1
 * failure. Folds the alias columns into their targets when the tolerant path
 * applies, so callers downstream only ever see the canonical nine codes.
 */
export function checkAndFoldHeader(
  header: string[],
  rows: Record<string, string>[],
): { hardFailures: AttendanceValidationIssue[]; rows: Record<string, string>[]; substitutions: string[] } {
  const canonical = new Set(ATTENDANCE_CSV_COLUMNS)
  const unexpected = header.filter((column) => !canonical.has(column) && !(column in ATTENDANCE_ALIAS_COLUMNS))

  if (unexpected.length > 0) {
    return {
      hardFailures: unexpected.map((column) => ({
        severity: 'hardFailure',
        row: 0,
        employeeNumber: '',
        code: 'unknownColumn',
        message: `Unexpected CSV column "${column}". Download a fresh template.`,
      })),
      rows,
      substitutions: [],
    }
  }

  const folded = foldAliasColumns(header, rows)
  const foldedHeader = new Set(header.filter((c) => !(c in ATTENDANCE_ALIAS_COLUMNS)))
  for (const alias of header) {
    if (alias in ATTENDANCE_ALIAS_COLUMNS) foldedHeader.add(ATTENDANCE_ALIAS_COLUMNS[alias])
  }

  const missing = ATTENDANCE_CSV_COLUMNS.filter((column) => !foldedHeader.has(column))
  const hardFailures: AttendanceValidationIssue[] = missing.map((column) => ({
    severity: 'hardFailure',
    row: 0,
    employeeNumber: '',
    code: 'missingColumn',
    message: `Missing CSV column "${column}". Download a fresh template.`,
  }))

  return { hardFailures, rows: folded.rows, substitutions: folded.substitutions }
}

export interface ValidateAttendanceInput {
  /** Post-fold rows — what validation and storage actually see. */
  rows: Record<string, string>[]
  /** Pre-fold rows, same order/count as `rows` — source of rawCodesSeen (§3.2). */
  originalRows: Record<string, string>[]
  daysInMonth: number
  employeesByNumber: Map<string, ResolvedAttendanceEmployee>
  /** Outlet display name (as the CSV writes it) → OutletId, reversed from OUTLET_NAMES. */
  outletIdByName: Record<string, string>
  /** Every active employee's number — drives W3's "scheduled but absent from file". */
  activeEmployeeNumbers: Set<string>
}

export interface ValidateAttendanceResult {
  hardFailures: AttendanceValidationIssue[]
  warnings: AttendanceValidationIssue[]
  records: AttendanceRecordDraft[]
  totals: AttendanceAggregateTotals
}

function isNonNegativeInteger(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') return false
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0
}

export function validateAttendanceRows(input: ValidateAttendanceInput): ValidateAttendanceResult {
  const hardFailures: AttendanceValidationIssue[] = []
  const warnings: AttendanceValidationIssue[] = []
  const records: AttendanceRecordDraft[] = []

  const seenNumbers = new Set<string>()
  const presentNumbers = new Set<string>()

  input.rows.forEach((row, index) => {
    const rowNumber = index + 2 // 1-based data row, matching the spreadsheet
    const originalRow = input.originalRows[index] ?? row
    const employeeNumber = (row.employee_number ?? '').trim()

    const fail = (code: string, message: string) =>
      hardFailures.push({ severity: 'hardFailure', row: rowNumber, employeeNumber, code, message })
    const warn = (code: string, message: string) =>
      warnings.push({ severity: 'warning', row: rowNumber, employeeNumber, code, message })

    const before = hardFailures.length

    // --- V2/V3 identity -------------------------------------------------
    if (!employeeNumber) {
      fail('missingEmployeeNumber', 'employee_number is blank — no join target.')
      return
    }
    presentNumbers.add(employeeNumber)
    if (seenNumbers.has(employeeNumber)) {
      fail('duplicateEmployeeNumber', `${employeeNumber} appears more than once in this file (V3).`)
      return
    }
    seenNumbers.add(employeeNumber)

    const employee = input.employeesByNumber.get(employeeNumber)
    if (!employee) {
      fail('employeeNotFound', `No employee with number ${employeeNumber} (V2).`)
      return
    }

    // --- V4 day values ----------------------------------------------------
    const days: Record<string, number> = {}
    let badValue = false
    for (const code of ATTENDANCE_CODES) {
      if (!isNonNegativeInteger(row[code])) {
        fail('invalidDayValue', `Column "${code}" must be a non-negative whole number (V4).`)
        badValue = true
        continue
      }
      days[code] = Number(row[code])
    }
    if (!isNonNegativeInteger(row.late_count)) {
      fail('invalidLateCount', 'late_count must be a non-negative whole number (V4).')
      badValue = true
    }
    if (badValue) return
    const lateCount = Number(row.late_count)

    // --- V5 reconciliation checksum ---------------------------------------
    const totalDays = ATTENDANCE_CODES.reduce((sum, code) => sum + days[code], 0)
    if (totalDays !== input.daysInMonth) {
      fail(
        'daysMismatch',
        `Σ days = ${totalDays}, expected ${input.daysInMonth} for this period (V5).`,
      )
    }

    // --- V7 punctuality bound -----------------------------------------------
    if (lateCount > days.WD) {
      fail('lateExceedsWorkingDays', `late_count (${lateCount}) cannot exceed WD (${days.WD}) (V7).`)
    }

    if (hardFailures.length > before) return

    // --- warnings -----------------------------------------------------------
    const csvName = (row.employee_name ?? '').trim()
    if (csvName && csvName.toLowerCase() !== employee.fullName.trim().toLowerCase()) {
      warn('nameMismatch', `employee_name "${csvName}" differs from the employee record's "${employee.fullName}" (W1).`)
    }
    const csvOutletName = (row.outlet ?? '').trim()
    const resolvedOutletId = input.outletIdByName[csvOutletName.toLowerCase()]
    if (!resolvedOutletId) {
      warn(
        'outletUnresolved',
        `Outlet "${csvOutletName}" does not match a known outlet name — using the employee record's outlet instead (W2).`,
      )
    } else if (resolvedOutletId !== employee.outletId) {
      warn('outletMismatch', `outlet "${csvOutletName}" differs from the employee record's outlet (W2).`)
    }
    if (employee.status !== 'active') {
      warn('inactiveEmployee', `${employee.fullName} is not active — expected only for a mid-month leaver (W4).`)
    }
    if (lateCount > 0 && days.WD === 0) {
      warn('lateWithNoWorkingDays', `${employee.fullName} has late_count > 0 but WD = 0 (W5).`)
    }

    const rawCodesSeen = Object.keys(ATTENDANCE_ALIAS_COLUMNS).filter(
      (alias) => Number(originalRow[alias] ?? 0) > 0,
    )

    records.push({
      employeeId: employee.employeeId,
      employeeNumber,
      employeeNameSnapshot: csvName || employee.fullName,
      departmentSnapshot: (row.department ?? '').trim(),
      outletIdSnapshot: resolvedOutletId ?? employee.outletId,
      employmentStatusSnapshot: employee.employmentStatus,
      days,
      rawCodesSeen,
      lateCount,
      totalDays,
    })
  })

  // W3 — active during the period but absent from the file.
  for (const employeeNumber of input.activeEmployeeNumbers) {
    if (presentNumbers.has(employeeNumber)) continue
    warnings.push({
      severity: 'warning',
      row: 0,
      employeeNumber,
      code: 'missingFromFile',
      message: `${employeeNumber} is active but has no row in this file (W3).`,
    })
  }

  const totals: AttendanceAggregateTotals = {
    headcount: records.length,
    totalWD: records.reduce((sum, r) => sum + r.days.WD, 0),
    totalEntitledLeave: records.reduce(
      (sum, r) => sum + r.days.PH + r.days.DP + r.days.AL + r.days.MC + r.days.EO + r.days.SL,
      0,
    ),
    totalUL: records.reduce((sum, r) => sum + r.days.UL, 0),
    totalLateIncidents: records.reduce((sum, r) => sum + r.lateCount, 0),
  }

  return { hardFailures, warnings, records, totals }
}
