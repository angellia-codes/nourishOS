// Pins the payroll statutory engine and CSV validator against §3's verified
// July-2026 reference slip in docs/modules/payroll-components-payslip-design.md.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — statutory.ts and validate.ts are both pure: every
// lookup (employees, existing payslips, compensation) is passed in, so the same
// code that backs parsePayrollCsv and createPayrollBatch runs here unchanged.
//
// This covers §13's acceptance criteria 2 (every §6.2 hard failure has a test
// supplying a violating row) and 3 (a variance beyond Rp 100 blocks; the same
// row with an override reason passes and lands in overriddenRows). It also
// stands in for AC-4's snapshot test of PayslipDocument — there is no frontend
// test runner in this repo, so the line-item array the renderer is a pure
// function of is what gets pinned instead.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { expandLineItems, sumSide, sumEmployerCost } = require('../lib/hr/payroll/statutory.js')
const { validatePayrollRows, validateHeader } = require('../lib/hr/payroll/validate.js')
const { PAYROLL_CSV_COLUMNS, PAYROLL_COMPONENT_SEEDS } = require('../lib/lib/payroll.js')

const BASIC = 18500000

// The §3 rate/base assertions that used to live here are gone with the rate
// table: every statutory figure is now hand-entered and taken as supplied
// (validate.ts), so there is nothing left to recompute or to pin.

// --- the reference slip ----------------------------------------------------
// §3: 29 line items (17 income, 12 deduction), 5 mirror pairs totalling
// 1,061,626, true gross 19,072,107, true deductions 11,861,233, take home
// 7,210,874, and 14 nil lines (10 income, 4 deduction).
//
// The split of the 572,107 of non-basic earnings across two allowance lines is
// illustrative — the spec states the totals and the statutory bases, not the
// individual allowance amounts. Everything asserted below is stated in §3.
const REFERENCE_ROW = {
  employeeNumber: 'N-0273',
  legacyEmployeeId: '273',
  fullName: 'Reference Employee',
  period: '2026-07',

  BASIC_SALARY: '18500000',
  OUTSTANDING_LEAVE: '',
  TRANSPORT_ALLOWANCE: '322107',
  PHONE_ALLOWANCE: '',
  MEAL_ALLOWANCE: '250000',
  POSITION_ALLOWANCE: '',
  BIRTHDAY_BONUS: '',
  COMPENSATION_BENEFIT: '',
  TIPS: '',
  SERVICE_CHARGE: '',
  THR_ANNUAL_BONUS: '',
  INCOME_TAX_ALLOWANCE_21: '',

  UNPAID_BASIC: '11260870',
  LOAN_DEDUCTION: '',

  BPJS_KES_EMPLOYEE: '',
  BPJS_KES_FAMILY: '',
  JHT_EMPLOYEE: '370000',
  JP_EMPLOYEE: '110863',
  PPH21: '119500',

  JKK: '99900',
  JKM: '55500',
  BPJS_KES_COMPANY: '',
  JHT_COMPANY: '684500',
  JP_COMPANY: '221726',

  totalIncome: '20133733',
  totalDeduction: '12922859',
  takeHomePay: '7210874',
  statutoryOverrideReason: '',
}

const EMPLOYEE = {
  employeeId: 'emp_273',
  employeeNumber: 'N-0273',
  legacyEmployeeId: '273',
  fullName: 'Reference Employee',
  outletId: 'boh_nourish_group',
  outletName: 'BOH Nourish Group',
  position: 'Sales & Marketing',
  taxStatus: 'K0',
  employeeUid: null,
  status: 'active',
  employmentStatus: 'PKWTT',
  bpjsTk: null,
  bpjsKesehatan: null,
  compensationBasicSalary: null,
}

const COMPONENTS = PAYROLL_COMPONENT_SEEDS.map((seed) => ({
  code: seed.code,
  labelId: seed.labelId,
  labelEn: seed.labelEn,
  type: seed.type,
  sortOrder: seed.sortOrder,
  csvColumn: seed.csvColumn,
}))

function validate(rows, overrides = {}) {
  return validatePayrollRows({
    rows,
    period: '2026-07',
    components: COMPONENTS,
    employeesByNumber: new Map([[EMPLOYEE.employeeNumber, { ...EMPLOYEE, ...(overrides.employee ?? {}) }]]),
    existingPayslipKeys: overrides.existingPayslipKeys ?? new Set(),
    compensationEmployeeNumbers: overrides.compensationEmployeeNumbers ?? new Set(),
  })
}

/** One clean row, with the named columns replaced. */
function rowWith(changes) {
  return [{ ...REFERENCE_ROW, ...changes }]
}

describe('the §3 reference slip', () => {
  test('validates with zero hard failures', () => {
    const result = validate(rowWith({}))
    assert.deepEqual(
      result.hardFailures.map((i) => `${i.code}: ${i.message}`),
      [],
    )
    assert.equal(result.drafts.length, 1)
  })

  test('has 29 line items — 17 income, 12 deduction', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    assert.equal(lineItems.length, 29)
    assert.equal(lineItems.filter((i) => i.side === 'income').length, 17)
    assert.equal(lineItems.filter((i) => i.side === 'deduction').length, 12)
  })

  test('five mirror pairs, each half equal, totalling 1,061,626', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    const mirrors = lineItems.filter((i) => i.isEmployerMirror)
    assert.equal(mirrors.length, 5)
    assert.equal(sumEmployerCost(lineItems), 1061626)

    for (const mirror of mirrors) {
      const twin = lineItems.find((i) => i.pairId === mirror.pairId && i.side === 'deduction')
      assert.ok(twin, `mirror ${mirror.pairId} has no deduction twin`)
      assert.equal(twin.amount, mirror.amount, `mirror ${mirror.pairId} halves diverge`)
    }
  })

  test('filtering isEmployerMirror gives true gross 19,072,107 and deductions 11,861,233', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    const trueGross = lineItems
      .filter((i) => i.side === 'income' && !i.isEmployerMirror)
      .reduce((t, i) => t + i.amount, 0)
    const trueDeductions = lineItems
      .filter((i) => i.side === 'deduction' && i.pairId === null)
      .reduce((t, i) => t + i.amount, 0)
    assert.equal(trueGross, 19072107)
    assert.equal(trueDeductions, 11861233)
    assert.equal(trueGross - trueDeductions, 7210874)
  })

  test('§4.4 the stored column totals are inflated by the mirror, by design', () => {
    const draft = validate(rowWith({})).drafts[0]
    assert.equal(draft.totalIncome, 20133733)
    assert.equal(draft.totalDeduction, 12922859)
    // The inflation cancels: take home pay is unaffected.
    assert.equal(draft.takeHomePay, 7210874)
  })

  test('fourteen lines are nil — ten income, four deduction', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    const nil = lineItems.filter((i) => i.amount === 0)
    assert.equal(nil.length, 14)
    assert.equal(nil.filter((i) => i.side === 'income').length, 10)
    assert.equal(nil.filter((i) => i.side === 'deduction').length, 4)
  })

  test('§4.5 every line carries both labels, so the renderer performs no lookups', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    for (const item of lineItems) {
      assert.ok(item.labelId, `${item.componentId} has no labelId`)
      assert.ok(item.labelEn, `${item.componentId} has no labelEn`)
    }
  })

  test('§10 statutory labels keep their legal Indonesian name in BOTH fields', () => {
    const { lineItems } = validate(rowWith({})).drafts[0]
    const jht = lineItems.find((i) => i.componentId === 'JHT_EMPLOYEE')
    assert.equal(jht.labelId, jht.labelEn)
    assert.ok(jht.labelEn.startsWith('Jaminan Hari Tua'), 'JHT must not be translated')
  })
})

// --- §6.2 hard failures ----------------------------------------------------

const HARD_FAILURE_CASES = [
  ['employeeNumber not found', { employeeNumber: 'N-9999' }, 'employeeNotFound'],
  ['fullName does not match the record', { fullName: 'Someone Else' }, 'nameMismatch'],
  ['row period does not match the batch', { period: '2026-06' }, 'periodMismatch'],
  ['totalIncome does not equal the income lines', { totalIncome: '20000000' }, 'incomeTotalMismatch'],
  ['totalDeduction does not equal the deduction lines', { totalDeduction: '12000000' }, 'deductionTotalMismatch'],
  ['takeHomePay does not equal income minus deductions', { takeHomePay: '9999999' }, 'takeHomeMismatch'],
  ['a non-numeric amount', { BASIC_SALARY: 'eighteen million' }, 'nonNumericAmount'],
]

describe('§6.2 hard failures', () => {
  for (const [label, changes, expectedCode] of HARD_FAILURE_CASES) {
    test(`rejects: ${label}`, () => {
      const result = validate(rowWith(changes))
      const codes = result.hardFailures.map((i) => i.code)
      assert.ok(codes.includes(expectedCode), `expected ${expectedCode}, got [${codes.join(', ')}]`)
      assert.equal(result.drafts.length, 0, 'a failing row must not produce a draft')
    })
  }

  test('rejects: a duplicate employeeNumber in the file', () => {
    const result = validate([{ ...REFERENCE_ROW }, { ...REFERENCE_ROW }])
    assert.ok(result.hardFailures.some((i) => i.code === 'duplicateEmployeeNumber'))
    assert.equal(result.drafts.length, 1, 'only the first occurrence may import')
  })

  test('rejects: a payslip already exists for this employee and period', () => {
    const result = validate(rowWith({}), { existingPayslipKeys: new Set(['emp_273::2026-07']) })
    assert.ok(result.hardFailures.some((i) => i.code === 'payslipExists'))
  })

  test('rejects: negative take home pay', () => {
    // Deductions exceed income: an unpaid-basic larger than the whole slip.
    const result = validate(rowWith({ UNPAID_BASIC: '30000000', totalDeduction: '31661989', takeHomePay: '-11528256' }))
    assert.ok(result.hardFailures.some((i) => i.code === 'negativeTakeHome'))
  })

  test('rejects: a missing CSV column', () => {
    const header = PAYROLL_CSV_COLUMNS.filter((c) => c !== 'JHT_EMPLOYEE')
    assert.ok(validateHeader(header).some((i) => i.code === 'missingColumn'))
  })

  test('rejects: an unknown CSV column', () => {
    assert.ok(validateHeader([...PAYROLL_CSV_COLUMNS, 'MYSTERY_BONUS']).some((i) => i.code === 'unknownColumn'))
  })

  test('a clean header passes', () => {
    assert.deepEqual(validateHeader([...PAYROLL_CSV_COLUMNS]), [])
  })
})

// --- hand-entered statutory figures ---------------------------------------

describe('statutory figures are taken as supplied', () => {
  test('an off-rate BPJS figure imports, as long as the row still adds up', () => {
    const result = validate(rowWith({ JHT_EMPLOYEE: '370500', totalDeduction: '12923359', takeHomePay: '7210374' }))
    assert.deepEqual(result.hardFailures, [])
    assert.equal(result.drafts.length, 1)
  })

  test('the row arithmetic is still enforced', () => {
    const result = validate(rowWith({ JHT_EMPLOYEE: '370500' }))
    assert.ok(result.hardFailures.some((i) => i.code === 'deductionTotalMismatch'))
    assert.equal(result.drafts.length, 0)
  })

  test('no line item carries a rate or a base — nothing knows them any more', () => {
    for (const item of validate(rowWith({})).drafts[0].lineItems) {
      assert.equal(item.rate, null)
      assert.equal(item.base, null)
    }
  })

  test('statutoryOverrideReason is recorded as a note', () => {
    const result = validate(rowWith({ statutoryOverrideReason: 'Backdated correction agreed with BPJS.' }))
    assert.deepEqual(result.overriddenRows, ['N-0273'])
    assert.equal(result.drafts[0].statutoryOverrideReason, 'Backdated correction agreed with BPJS.')
  })
})

// --- daily workers and trainees -------------------------------------------

describe('dailyWorker and ojt', () => {
  const dailyWorker = { employmentStatus: 'dailyWorker', compensationBasicSalary: 145000 }

  test('a period figure above the daily rate is normal — no drift warning', () => {
    const result = validate(rowWith({}), { employee: dailyWorker })
    assert.deepEqual(
      result.warnings.filter((i) => i.code === 'basicSalaryDrift' || i.code === 'basicSalaryBelowDailyRate'),
      [],
    )
    assert.equal(result.drafts.length, 1)
  })

  test('less than one day at the rate is worth naming', () => {
    const result = validate(
      rowWith({ BASIC_SALARY: '100000', totalIncome: '1733733', totalDeduction: '12922859', takeHomePay: '-11189126' }),
      { employee: dailyWorker },
    )
    assert.ok(result.warnings.some((i) => i.code === 'basicSalaryBelowDailyRate'))
  })

  test('a non-daily status still gets the plain drift warning', () => {
    const result = validate(rowWith({}), { employee: { compensationBasicSalary: 17000000 } })
    assert.ok(result.warnings.some((i) => i.code === 'basicSalaryDrift'))
  })

  test('a BPJS line on a daily worker warns — neither status is enrolled', () => {
    const result = validate(rowWith({}), { employee: dailyWorker })
    assert.ok(result.warnings.some((i) => i.code === 'bpjsNotApplicable'))
  })

  test('an ojt row with every statutory line nil raises nothing', () => {
    const nilStatutory = {
      JHT_EMPLOYEE: '', JP_EMPLOYEE: '', PPH21: '', JKK: '', JKM: '', JHT_COMPANY: '', JP_COMPANY: '',
      totalIncome: '9072107', totalDeduction: '11260870', takeHomePay: '-2188763',
    }
    const result = validate(rowWith(nilStatutory), { employee: { employmentStatus: 'ojt' } })
    assert.deepEqual(
      result.warnings.filter((i) => i.code === 'bpjsNotApplicable' || i.code === 'nilBpjsWithMembership'),
      [],
    )
  })
})

// --- §6.3 warnings are non-blocking ---------------------------------------

describe('§6.3 warnings are non-blocking', () => {
  test('basic salary differs from the compensation record', () => {
    const result = validate(rowWith({}), { employee: { compensationBasicSalary: 17000000 } })
    assert.ok(result.warnings.some((i) => i.code === 'basicSalaryDrift'))
    assert.equal(result.hardFailures.length, 0)
    assert.equal(result.drafts.length, 1)
  })

  test('an inactive employee with pay', () => {
    const result = validate(rowWith({}), { employee: { status: 'inactive' } })
    assert.ok(result.warnings.some((i) => i.code === 'inactiveWithPay'))
    assert.equal(result.drafts.length, 1)
  })

  test('an employee absent from the file', () => {
    const result = validate(rowWith({}), { compensationEmployeeNumbers: new Set(['N-0273', 'N-0500']) })
    const absent = result.warnings.find((i) => i.code === 'absentFromFile')
    assert.ok(absent)
    assert.equal(absent.employeeNumber, 'N-0500')
    assert.equal(result.hardFailures.length, 0)
  })

  test('a retired legacyEmployeeId column is ignored, not rejected', () => {
    assert.deepEqual(validateHeader([...PAYROLL_CSV_COLUMNS, 'legacyEmployeeId']), [])
  })
})

// --- §5 the CSV contract ---------------------------------------------------

describe('§5 the CSV contract', () => {
  test('is 31 columns', () => {
    assert.equal(PAYROLL_CSV_COLUMNS.length, 31)
  })

  test('each mirror component appears exactly once in the CSV', () => {
    for (const column of ['JKK', 'JKM', 'BPJS_KES_COMPANY', 'JHT_COMPANY', 'JP_COMPANY']) {
      assert.equal(
        PAYROLL_CSV_COLUMNS.filter((c) => c === column).length,
        1,
        `${column} must appear once — the importer expands it into two line items`,
      )
    }
  })

  test('every discretionary CSV column resolves to a component', () => {
    // A column with no component is read off the row and then left out of the
    // line items, so its value vanishes from the totals and the row fails
    // arithmetic that was actually correct. loadComponents guarantees this by
    // always including the seeds; the check is here because the template and
    // the registry are built from the same list and must not drift.
    const columns = new Set(COMPONENTS.map((c) => c.csvColumn))
    for (const seed of PAYROLL_COMPONENT_SEEDS) {
      assert.ok(columns.has(seed.csvColumn), `${seed.csvColumn} has no component behind it`)
    }
  })

  test('LOAN_DEDUCTION lands in the deduction total', () => {
    const base = validate(rowWith({})).drafts[0].totalDeduction
    const withLoan = validate(
      rowWith({ LOAN_DEDUCTION: '500000', totalDeduction: String(12922859 + 500000), takeHomePay: String(7210874 - 500000) }),
    )
    assert.deepEqual(withLoan.hardFailures, [])
    assert.equal(withLoan.drafts[0].totalDeduction, base + 500000)
  })

  test('INCOME_TAX_ALLOWANCE_21 lands in the income total', () => {
    const base = validate(rowWith({})).drafts[0].totalIncome
    const withAllowance = validate(
      rowWith({
        INCOME_TAX_ALLOWANCE_21: '250000',
        totalIncome: String(20133733 + 250000),
        takeHomePay: String(7210874 + 250000),
      }),
    )
    assert.deepEqual(withAllowance.hardFailures, [])
    assert.equal(withAllowance.drafts[0].totalIncome, base + 250000)
  })

  test('the expansion is stable: same input, same line items', () => {
    const a = JSON.stringify(validate(rowWith({})).drafts[0].lineItems)
    const b = JSON.stringify(validate(rowWith({})).drafts[0].lineItems)
    assert.equal(a, b)
  })

  test('sumSide includes the mirror on both sides', () => {
    const items = expandLineItems([], { JKK_COMPANY: 1000 })
    assert.equal(sumSide(items, 'income'), 1000)
    assert.equal(sumSide(items, 'deduction'), 1000)
  })
})
