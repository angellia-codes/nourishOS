// Pins the payroll statutory engine and CSV validator against §3's verified
// July-2026 reference slip in docs/modules/payroll-components-payslip-design.md.
//
//   npm --prefix functions run build
//   node functions/test/payroll-statutory.mjs
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
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { recomputeStatutory, expandLineItems, sumSide, sumEmployerCost } = require('../lib/hr/payroll/statutory.js')
const { validatePayrollRows, validateHeader } = require('../lib/hr/payroll/validate.js')
const { PAYROLL_CSV_COLUMNS, PAYROLL_COMPONENT_SEEDS } = require('../lib/lib/payroll.js')

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

// --- §4.2 the 2026 parameters --------------------------------------------
const RATES = {
  jkk: 0.0054,
  jkm: 0.003,
  jhtCompany: 0.037,
  jhtEmployee: 0.02,
  jpCompany: 0.02,
  jpEmployee: 0.01,
  bpjsKesCo: 0.04,
  bpjsKesEmp: 0.01,
  bpjsKesFam: 0.01,
  jpWageCeiling: 11086300,
  bpjsKesCeiling: 12000000,
}

const BASIC = 18500000

// --- §3 verified calculation bases ---------------------------------------

check('§3 JKK company: 0.54% of basic salary = 99,900', () => {
  const jkk = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JKK_COMPANY')
  assert.strictEqual(jkk.amount, 99900)
  assert.strictEqual(jkk.base, BASIC)
})

check('§3 JKM company: 0.3% of basic salary = 55,500', () => {
  const jkm = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JKM_COMPANY')
  assert.strictEqual(jkm.amount, 55500)
})

check('§3 JHT company: 3.7% of basic salary = 684,500', () => {
  const jht = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JHT_COMPANY')
  assert.strictEqual(jht.amount, 684500)
})

check('§3 JHT employee: 2% of basic salary = 370,000', () => {
  const jht = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JHT_EMPLOYEE')
  assert.strictEqual(jht.amount, 370000)
})

check('§3 JP company: 2% of the CAPPED base = 221,726, not of basic salary', () => {
  const jp = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JP_COMPANY')
  assert.strictEqual(jp.base, 11086300, 'JP must use the statutory wage ceiling')
  assert.strictEqual(jp.amount, 221726)
  assert.notStrictEqual(jp.amount, Math.round(0.02 * BASIC), 'JP must not be computed off basic salary')
})

check('§3 JP employee: 1% of the capped base = 110,863', () => {
  const jp = recomputeStatutory(RATES, BASIC).find((c) => c.componentId === 'JP_EMPLOYEE')
  assert.strictEqual(jp.amount, 110863)
})

check('a salary below the JP ceiling uses the salary itself, not the ceiling', () => {
  const jp = recomputeStatutory(RATES, 5000000).find((c) => c.componentId === 'JP_EMPLOYEE')
  assert.strictEqual(jp.base, 5000000)
  assert.strictEqual(jp.amount, 50000)
})

check('§6.4 recomputes exactly nine components — PPh 21 has no rate or base', () => {
  const ids = recomputeStatutory(RATES, BASIC).map((c) => c.componentId)
  assert.strictEqual(ids.length, 9)
  assert.ok(!ids.includes('PPH21'))
})

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
    parametersYear: 2026,
    rates: RATES,
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

check('the reference slip validates with zero hard failures', () => {
  const result = validate(rowWith({}))
  assert.deepStrictEqual(
    result.hardFailures.map((i) => `${i.code}: ${i.message}`),
    [],
  )
  assert.strictEqual(result.drafts.length, 1)
})

check('§3 the slip has 29 line items — 17 income, 12 deduction', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  assert.strictEqual(lineItems.length, 29)
  assert.strictEqual(lineItems.filter((i) => i.side === 'income').length, 17)
  assert.strictEqual(lineItems.filter((i) => i.side === 'deduction').length, 12)
})

check('§3 five mirror pairs, each half equal, totalling 1,061,626', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  const mirrors = lineItems.filter((i) => i.isEmployerMirror)
  assert.strictEqual(mirrors.length, 5)
  assert.strictEqual(sumEmployerCost(lineItems), 1061626)

  for (const mirror of mirrors) {
    const twin = lineItems.find((i) => i.pairId === mirror.pairId && i.side === 'deduction')
    assert.ok(twin, `mirror ${mirror.pairId} has no deduction twin`)
    assert.strictEqual(twin.amount, mirror.amount, `mirror ${mirror.pairId} halves diverge`)
  }
})

check('§3 filtering isEmployerMirror gives true gross 19,072,107 and deductions 11,861,233', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  const trueGross = lineItems
    .filter((i) => i.side === 'income' && !i.isEmployerMirror)
    .reduce((t, i) => t + i.amount, 0)
  const trueDeductions = lineItems
    .filter((i) => i.side === 'deduction' && i.pairId === null)
    .reduce((t, i) => t + i.amount, 0)
  assert.strictEqual(trueGross, 19072107)
  assert.strictEqual(trueDeductions, 11861233)
  assert.strictEqual(trueGross - trueDeductions, 7210874)
})

check('§4.4 the stored column totals are inflated by the mirror, by design', () => {
  const draft = validate(rowWith({})).drafts[0]
  assert.strictEqual(draft.totalIncome, 20133733)
  assert.strictEqual(draft.totalDeduction, 12922859)
  // The inflation cancels: take home pay is unaffected.
  assert.strictEqual(draft.takeHomePay, 7210874)
})

check('§3 fourteen lines are nil — ten income, four deduction', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  const nil = lineItems.filter((i) => i.amount === 0)
  assert.strictEqual(nil.length, 14)
  assert.strictEqual(nil.filter((i) => i.side === 'income').length, 10)
  assert.strictEqual(nil.filter((i) => i.side === 'deduction').length, 4)
})

check('§4.5 every line carries both labels, so the renderer performs no lookups', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  for (const item of lineItems) {
    assert.ok(item.labelId, `${item.componentId} has no labelId`)
    assert.ok(item.labelEn, `${item.componentId} has no labelEn`)
  }
})

check('§10 statutory labels keep their legal Indonesian name in BOTH fields', () => {
  const { lineItems } = validate(rowWith({})).drafts[0]
  const jht = lineItems.find((i) => i.componentId === 'JHT_EMPLOYEE')
  assert.strictEqual(jht.labelId, jht.labelEn)
  assert.ok(jht.labelEn.startsWith('Jaminan Hari Tua'), 'JHT must not be translated')
})

// --- §6.2 hard failures ----------------------------------------------------

const HARD_FAILURE_CASES = [
  ['employeeNumber not found', { employeeNumber: 'N-9999' }, 'employeeNotFound'],
  ['fullName does not match the record', { fullName: 'Someone Else' }, 'nameMismatch'],
  ['legacyEmployeeId mismatch', { legacyEmployeeId: '999' }, 'legacyIdMismatch'],
  ['row period does not match the batch', { period: '2026-06' }, 'periodMismatch'],
  ['totalIncome does not equal the income lines', { totalIncome: '20000000' }, 'incomeTotalMismatch'],
  ['totalDeduction does not equal the deduction lines', { totalDeduction: '12000000' }, 'deductionTotalMismatch'],
  ['takeHomePay does not equal income minus deductions', { takeHomePay: '9999999' }, 'takeHomeMismatch'],
  ['a non-numeric amount', { BASIC_SALARY: 'eighteen million' }, 'nonNumericAmount'],
  [
    'a statutory variance beyond Rp 100',
    { JHT_EMPLOYEE: '370500', totalDeduction: '12923359', takeHomePay: '7210374' },
    'statutoryVariance',
  ],
]

for (const [label, changes, expectedCode] of HARD_FAILURE_CASES) {
  check(`§6.2 rejects: ${label}`, () => {
    const result = validate(rowWith(changes))
    const codes = result.hardFailures.map((i) => i.code)
    assert.ok(codes.includes(expectedCode), `expected ${expectedCode}, got [${codes.join(', ')}]`)
    assert.strictEqual(result.drafts.length, 0, 'a failing row must not produce a draft')
  })
}

check('§6.2 rejects: a duplicate employeeNumber in the file', () => {
  const result = validate([{ ...REFERENCE_ROW }, { ...REFERENCE_ROW }])
  assert.ok(result.hardFailures.some((i) => i.code === 'duplicateEmployeeNumber'))
  assert.strictEqual(result.drafts.length, 1, 'only the first occurrence may import')
})

check('§6.2 rejects: a payslip already exists for this employee and period', () => {
  const result = validate(rowWith({}), { existingPayslipKeys: new Set(['emp_273::2026-07']) })
  assert.ok(result.hardFailures.some((i) => i.code === 'payslipExists'))
})

check('§6.2 rejects: negative take home pay', () => {
  // Deductions exceed income: an unpaid-basic larger than the whole slip.
  const result = validate(rowWith({ UNPAID_BASIC: '30000000', totalDeduction: '31661989', takeHomePay: '-11528256' }))
  assert.ok(result.hardFailures.some((i) => i.code === 'negativeTakeHome'))
})

check('§6.2 rejects: a missing CSV column', () => {
  const header = PAYROLL_CSV_COLUMNS.filter((c) => c !== 'JHT_EMPLOYEE')
  const issues = validateHeader(header)
  assert.ok(issues.some((i) => i.code === 'missingColumn'))
})

check('§6.2 rejects: an unknown CSV column', () => {
  const issues = validateHeader([...PAYROLL_CSV_COLUMNS, 'MYSTERY_BONUS'])
  assert.ok(issues.some((i) => i.code === 'unknownColumn'))
})

check('a clean header passes', () => {
  assert.deepStrictEqual(validateHeader([...PAYROLL_CSV_COLUMNS]), [])
})

// --- §6.4 the override escape hatch ---------------------------------------

check('§6.4 an override reason lets the same variance through, and is recorded', () => {
  // Totals move with the amount so the only violation is the statutory one:
  // the override bypasses §6.4's recompute, NOT §6.2's arithmetic checks.
  const variance = { JHT_EMPLOYEE: '370500', totalDeduction: '12923359', takeHomePay: '7210374' }

  const blocked = validate(rowWith(variance))
  assert.ok(blocked.hardFailures.some((i) => i.code === 'statutoryVariance'))
  assert.strictEqual(blocked.drafts.length, 0)

  const allowed = validate(
    rowWith({ ...variance, statutoryOverrideReason: 'Backdated correction agreed with BPJS.' }),
  )
  assert.deepStrictEqual(
    allowed.hardFailures.filter((i) => i.code === 'statutoryVariance'),
    [],
  )
  assert.deepStrictEqual(allowed.overriddenRows, ['N-0273'])
  assert.strictEqual(allowed.drafts[0].statutoryOverrideReason, 'Backdated correction agreed with BPJS.')
})

check('§6.4 an override does NOT bypass §6.2 arithmetic — only the recompute', () => {
  const result = validate(
    rowWith({ JHT_EMPLOYEE: '370500', statutoryOverrideReason: 'Backdated correction agreed with BPJS.' }),
  )
  assert.ok(
    result.hardFailures.some((i) => i.code === 'deductionTotalMismatch'),
    'source arithmetic must still be checked on an overridden row',
  )
  assert.strictEqual(result.drafts.length, 0)
})

check('§6.4 a variance inside the Rp 100 tolerance is absorbed', () => {
  // 370,000 -> 370,080 is 80 rupiah of rounding; the totals move with it.
  const result = validate(rowWith({ JHT_EMPLOYEE: '370080', totalDeduction: '12922939', takeHomePay: '7210794' }))
  assert.deepStrictEqual(
    result.hardFailures.filter((i) => i.code === 'statutoryVariance'),
    [],
  )
})

check('nil BPJS Kesehatan does not hard-fail — it is per-enrolment (see validate.ts)', () => {
  const result = validate(rowWith({}))
  assert.deepStrictEqual(
    result.hardFailures.filter((i) => i.code === 'statutoryVariance'),
    [],
  )
})

check('a supplied BPJS Kesehatan figure IS still checked against the recompute', () => {
  const result = validate(rowWith({ BPJS_KES_EMPLOYEE: '1' }))
  assert.ok(result.hardFailures.some((i) => i.code === 'statutoryVariance'))
})

// --- §6.3 warnings are non-blocking ---------------------------------------

check('§6.3 warns but does not block: basic salary differs from the compensation record', () => {
  const result = validate(rowWith({}), { employee: { compensationBasicSalary: 17000000 } })
  assert.ok(result.warnings.some((i) => i.code === 'basicSalaryDrift'))
  assert.strictEqual(result.hardFailures.length, 0)
  assert.strictEqual(result.drafts.length, 1)
})

check('§6.3 warns but does not block: an inactive employee with pay', () => {
  const result = validate(rowWith({}), { employee: { status: 'inactive' } })
  assert.ok(result.warnings.some((i) => i.code === 'inactiveWithPay'))
  assert.strictEqual(result.drafts.length, 1)
})

check('§6.3 warns but does not block: an employee absent from the file', () => {
  const result = validate(rowWith({}), { compensationEmployeeNumbers: new Set(['N-0273', 'N-0500']) })
  const absent = result.warnings.find((i) => i.code === 'absentFromFile')
  assert.ok(absent)
  assert.strictEqual(absent.employeeNumber, 'N-0500')
  assert.strictEqual(result.hardFailures.length, 0)
})

check('§6.3 warns when the legacy id cannot be cross-checked, and still imports', () => {
  const result = validate(rowWith({}), { employee: { legacyEmployeeId: null } })
  assert.ok(result.warnings.some((i) => i.code === 'legacyIdUnverified'))
  assert.strictEqual(result.hardFailures.length, 0)
  assert.strictEqual(result.drafts.length, 1, 'a partial backfill must not block the import')
})

// --- §5 the CSV contract ---------------------------------------------------

check('§5 the CSV contract is 32 columns', () => {
  assert.strictEqual(PAYROLL_CSV_COLUMNS.length, 32)
})

check('§5 each mirror component appears exactly once in the CSV', () => {
  for (const column of ['JKK', 'JKM', 'BPJS_KES_COMPANY', 'JHT_COMPANY', 'JP_COMPANY']) {
    assert.strictEqual(
      PAYROLL_CSV_COLUMNS.filter((c) => c === column).length,
      1,
      `${column} must appear once — the importer expands it into two line items`,
    )
  }
})

check('the expansion is stable: same input, same line items', () => {
  const a = JSON.stringify(validate(rowWith({})).drafts[0].lineItems)
  const b = JSON.stringify(validate(rowWith({})).drafts[0].lineItems)
  assert.strictEqual(a, b)
})

check('sumSide includes the mirror on both sides', () => {
  const items = expandLineItems([], { JKK_COMPANY: 1000 }, RATES, 0)
  assert.strictEqual(sumSide(items, 'income'), 1000)
  assert.strictEqual(sumSide(items, 'deduction'), 1000)
})

console.log('')
if (failures > 0) {
  console.error(`${failures} check(s) failed.`)
  process.exit(1)
}
console.log('All payroll statutory checks passed.')
