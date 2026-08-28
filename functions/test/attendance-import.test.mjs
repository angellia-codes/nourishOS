// Pins the attendance CSV taxonomy/validator — attendance.md §2/§5.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — codes.ts and validate.ts are both pure: every lookup
// (employees, outlet name reversal, the active roster) is passed in, so the
// same code that backs previewAttendanceImport and importAttendancePeriod
// runs here unchanged.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { foldAliasColumns, ATTENDANCE_CSV_COLUMNS, ATTENDANCE_CODES } = require('../lib/hr/attendance/codes.js')
const { checkAndFoldHeader, validateAttendanceRows } = require('../lib/hr/attendance/validate.js')

const EMPLOYEE = {
  employeeId: 'emp1',
  employeeNumber: 'N0001',
  fullName: 'Yulius Umbu Japa',
  outletId: 'nourish_uluwatu',
  employmentStatus: 'PKWT',
  status: 'active',
}
const employeesByNumber = new Map([[EMPLOYEE.employeeNumber, EMPLOYEE]])
const outletIdByName = { 'nourish uluwatu': 'nourish_uluwatu' }
const DAYS_IN_JULY = 31

function baseRow(overrides = {}) {
  return {
    employee_number: 'N0001',
    employee_name: 'Yulius Umbu Japa',
    department: 'Floor',
    outlet: 'Nourish Uluwatu',
    WD: '26',
    PH: '0',
    DP: '0',
    AL: '0',
    MC: '0',
    EO: '0',
    SL: '0',
    DO: '5',
    UL: '0',
    late_count: '0',
    ...overrides,
  }
}

function validate(rows, overrides = {}) {
  return validateAttendanceRows({
    rows,
    originalRows: rows,
    daysInMonth: DAYS_IN_JULY,
    employeesByNumber,
    outletIdByName,
    activeEmployeeNumbers: new Set(['N0001']),
    ...overrides,
  })
}

describe('§2.2 D4 — legacy alias folding', () => {
  test('NPL folds into UL, summing when UL is also present', () => {
    const header = [...ATTENDANCE_CSV_COLUMNS.filter((c) => c !== 'UL'), 'NPL', 'UL']
    const rows = [baseRow({ UL: '1', NPL: '2' })]
    const { rows: folded, substitutions } = foldAliasColumns(header, rows)
    assert.equal(folded[0].UL, '3')
    assert.equal(folded[0].NPL, undefined)
    assert.deepEqual(substitutions, ['NPL → UL'])
  })

  test('checkAndFoldHeader accepts the canonical header, no fold needed', () => {
    const rows = [baseRow()]
    const { hardFailures, substitutions } = checkAndFoldHeader(Object.keys(rows[0]), rows)
    assert.equal(hardFailures.length, 0)
    assert.equal(substitutions.length, 0)
  })

  test('checkAndFoldHeader rejects a genuinely unknown column (V6)', () => {
    const rows = [baseRow({ XYZ: '1' })]
    const { hardFailures } = checkAndFoldHeader(Object.keys(rows[0]), rows)
    assert.ok(hardFailures.some((f) => f.code === 'unknownColumn'))
  })
})

describe('§5.1 hard rules', () => {
  test('a valid row produces one record and no failures', () => {
    const result = validate([baseRow()])
    assert.equal(result.hardFailures.length, 0)
    assert.equal(result.records.length, 1)
    assert.equal(result.records[0].totalDays, DAYS_IN_JULY)
  })

  test('V2 — unknown employee_number fails', () => {
    assert.ok(validate([baseRow({ employee_number: 'N9999' })]).hardFailures.some((f) => f.code === 'employeeNotFound'))
  })

  test('V3 — duplicate employee_number within the file fails', () => {
    assert.ok(validate([baseRow(), baseRow()]).hardFailures.some((f) => f.code === 'duplicateEmployeeNumber'))
  })

  test('V4 — a negative day value fails', () => {
    assert.ok(validate([baseRow({ WD: '-1' })]).hardFailures.some((f) => f.code === 'invalidDayValue'))
  })

  test('V5 — Σ days must equal daysInMonth', () => {
    // 20 + 5 DO = 25, not 31.
    assert.ok(validate([baseRow({ WD: '20' })]).hardFailures.some((f) => f.code === 'daysMismatch'))
  })

  test('V7 — late_count cannot exceed WD', () => {
    assert.ok(validate([baseRow({ late_count: '99' })]).hardFailures.some((f) => f.code === 'lateExceedsWorkingDays'))
  })

  test('W3 — an active employee missing from the file is warned, not failed', () => {
    const result = validate([], { activeEmployeeNumbers: new Set(['N0001']) })
    assert.equal(result.hardFailures.length, 0)
    assert.ok(result.warnings.some((w) => w.code === 'missingFromFile'))
  })
})

describe('D2 — classification sanity', () => {
  test('exactly nine codes, MC and EO are not in the same class as UL', () => {
    assert.equal(ATTENDANCE_CODES.length, 9)
  })
})
