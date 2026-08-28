// Pins the attendance CSV taxonomy/validator — attendance.md §2/§5.
//
//   npm --prefix functions run build
//   node functions/test/attendance-import.mjs
//
// No emulator needed — codes.ts and validate.ts are both pure: every lookup
// (employees, outlet name reversal, the active roster) is passed in, so the
// same code that backs previewAttendanceImport and importAttendancePeriod
// runs here unchanged.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { foldAliasColumns, ATTENDANCE_CSV_COLUMNS, ATTENDANCE_CODES } = require('../lib/hr/attendance/codes.js')
const { checkAndFoldHeader, validateAttendanceRows } = require('../lib/hr/attendance/validate.js')

let failures = 0
function check(label, fn) {
  try {
    fn()
    console.log(`✓ ${label}`)
  } catch (error) {
    failures += 1
    console.error(`✗ ${label} — ${error.message}`)
  }
}

const EMPLOYEE = { employeeId: 'emp1', employeeNumber: 'N0001', fullName: 'Yulius Umbu Japa', outletId: 'nourish_uluwatu', employmentStatus: 'PKWT', status: 'active' }
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

// --- §2.2 D4 — legacy alias folding -----------------------------------------
check('NPL folds into UL, summing when UL is also present', () => {
  const header = [...ATTENDANCE_CSV_COLUMNS.filter((c) => c !== 'UL'), 'NPL', 'UL']
  const rows = [baseRow({ UL: '1', NPL: '2' })]
  const { rows: folded, substitutions } = foldAliasColumns(header, rows)
  assert.strictEqual(folded[0].UL, '3')
  assert.strictEqual(folded[0].NPL, undefined)
  assert.deepStrictEqual(substitutions, ['NPL → UL'])
})

check('checkAndFoldHeader accepts the canonical header, no fold needed', () => {
  const rows = [baseRow()]
  const { hardFailures, substitutions } = checkAndFoldHeader(Object.keys(rows[0]), rows)
  assert.strictEqual(hardFailures.length, 0)
  assert.strictEqual(substitutions.length, 0)
})

check('checkAndFoldHeader rejects a genuinely unknown column (V6)', () => {
  const rows = [baseRow({ XYZ: '1' })]
  const { hardFailures } = checkAndFoldHeader(Object.keys(rows[0]), rows)
  assert.ok(hardFailures.some((f) => f.code === 'unknownColumn'))
})

// --- §5.1 hard rules ---------------------------------------------------------
check('a valid row produces one record and no failures', () => {
  const result = validate([baseRow()])
  assert.strictEqual(result.hardFailures.length, 0)
  assert.strictEqual(result.records.length, 1)
  assert.strictEqual(result.records[0].totalDays, DAYS_IN_JULY)
})

check('V2 — unknown employee_number fails', () => {
  const result = validate([baseRow({ employee_number: 'N9999' })])
  assert.ok(result.hardFailures.some((f) => f.code === 'employeeNotFound'))
})

check('V3 — duplicate employee_number within the file fails', () => {
  const result = validate([baseRow(), baseRow()])
  assert.ok(result.hardFailures.some((f) => f.code === 'duplicateEmployeeNumber'))
})

check('V4 — a negative day value fails', () => {
  const result = validate([baseRow({ WD: '-1' })])
  assert.ok(result.hardFailures.some((f) => f.code === 'invalidDayValue'))
})

check('V5 — Σ days must equal daysInMonth', () => {
  const result = validate([baseRow({ WD: '20' })]) // 20 + 5 DO = 25, not 31
  assert.ok(result.hardFailures.some((f) => f.code === 'daysMismatch'))
})

check('V7 — late_count cannot exceed WD', () => {
  const result = validate([baseRow({ late_count: '99' })])
  assert.ok(result.hardFailures.some((f) => f.code === 'lateExceedsWorkingDays'))
})

check('W3 — an active employee missing from the file is warned, not failed', () => {
  const result = validate([], { activeEmployeeNumbers: new Set(['N0001']) })
  assert.strictEqual(result.hardFailures.length, 0)
  assert.ok(result.warnings.some((w) => w.code === 'missingFromFile'))
})

// --- D2 — classification sanity ---------------------------------------------
check('exactly nine codes, MC and EO are not in the same class as UL', () => {
  assert.strictEqual(ATTENDANCE_CODES.length, 9)
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll attendance import checks passed.')
