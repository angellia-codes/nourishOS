import {
  PAYROLL_CSV_COLUMNS,
  PAYROLL_CSV_OVERRIDE_COLUMN,
  STATUTORY_COMPONENTS,
  STATUTORY_TOLERANCE_IDR,
} from '../../lib/payroll'
import {
  expandLineItems,
  sumEmployerCost,
  sumSide,
  type DiscretionaryInput,
  type LineItem,
} from './statutory'

/**
 * CSV validation — payroll-components-payslip-design.md §6.2/§6.3/§6.4.
 *
 * Pure: no Firestore, no auth. Every lookup it needs (employees, existing
 * payslips, compensation records) is passed in, so the same function backs
 * both `parsePayrollCsv`'s advisory preview and `createPayrollBatch`'s
 * server-side gate. The preview is never the gate — §6.1.
 */

export type ValidationSeverity = 'hardFailure' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  row: number
  employeeNumber: string
  code: string
  message: string
}

/** Everything the validator needs to know about one employee, read server-side. */
export interface ResolvedEmployee {
  employeeId: string
  employeeNumber: string
  legacyEmployeeId: string | null
  fullName: string
  outletId: string
  outletName: string
  position: string
  taxStatus: string | null
  employeeUid: string | null
  status: string
  /** EMPLOYMENT_STATUS — 'dailyWorker' and 'ojt' are treated differently below. */
  employmentStatus: string
  bpjsTk: string | null
  bpjsKesehatan: string | null
  /** From employees/{id}/compensation/current, when one exists. */
  compensationBasicSalary: number | null
}

export interface DiscretionaryComponent {
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  csvColumn: string
}

export interface ValidateInput {
  /** Raw CSV rows, header-keyed, in file order. */
  rows: Record<string, string>[]
  period: string
  /** Active discretionary components, from the payrollComponents registry. */
  components: DiscretionaryComponent[]
  employeesByNumber: Map<string, ResolvedEmployee>
  /** `${employeeId}::${period}` for every payslip already on file. */
  existingPayslipKeys: Set<string>
  /** Employee numbers with a compensation record — drives §6.3's omission warning. */
  compensationEmployeeNumbers: Set<string>
}

export interface PayslipDraft {
  employee: ResolvedEmployee
  lineItems: LineItem[]
  totalIncome: number
  totalDeduction: number
  takeHomePay: number
  totalEmployerCost: number
  statutoryOverrideReason: string | null
}

export interface ValidateResult {
  hardFailures: ValidationIssue[]
  warnings: ValidationIssue[]
  overriddenRows: string[]
  /** Only rows that produced no hard failure. */
  drafts: PayslipDraft[]
  totals: {
    totalIncome: number
    totalDeduction: number
    totalTakeHomePay: number
    totalEmployerCost: number
  }
}

/**
 * Neither is enrolled in BPJS: every statutory line but PPh 21 is nil for them.
 * Nothing enforces that — statutory figures are hand-entered and taken as
 * supplied — so a non-nil line on one of these rows raises the
 * `bpjsNotApplicable` warning rather than passing unremarked.
 */
const BPJS_EXEMPT_EMPLOYMENT_STATUSES = new Set(['dailyWorker', 'ojt'])

/**
 * A daily worker's compensation record holds a **per-day rate** (Rp 145.000 at
 * the time of writing), while the CSV carries what was actually earned in the
 * period — the rate times the days worked. Comparing the two directly is what
 * made `basicSalaryDrift` fire on every daily-worker row.
 */
const DAILY_RATE_EMPLOYMENT_STATUSES = new Set(['dailyWorker'])

/** §5 — empty cells are zero. The nil / not-applicable distinction is a render concern. */
function amountOf(row: Record<string, string>, column: string): number {
  const raw = (row[column] ?? '').trim()
  if (!raw) return 0
  return Number(raw.replace(/,/g, ''))
}

function isBadNumber(value: number): boolean {
  return Number.isNaN(value) || !Number.isFinite(value)
}

/**
 * §6.2 — schema drift. Checked once against the header, not per row: an
 * unknown or missing column means the file was built from the wrong template
 * and nothing downstream can be trusted.
 */
export function validateHeader(header: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const expected = new Set(PAYROLL_CSV_COLUMNS)
  const actual = new Set(header)

  for (const column of PAYROLL_CSV_COLUMNS) {
    if (!actual.has(column)) {
      issues.push({
        severity: 'hardFailure',
        row: 0,
        employeeNumber: '',
        code: 'missingColumn',
        message: `Missing CSV column "${column}". Download a fresh template.`,
      })
    }
  }
  for (const column of header) {
    if (column && !expected.has(column)) {
      issues.push({
        severity: 'hardFailure',
        row: 0,
        employeeNumber: '',
        code: 'unknownColumn',
        message: `Unexpected CSV column "${column}". Download a fresh template.`,
      })
    }
  }
  return issues
}

export function validatePayrollRows(input: ValidateInput): ValidateResult {
  const hardFailures: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const overriddenRows: string[] = []
  const drafts: PayslipDraft[] = []

  const seenNumbers = new Set<string>()
  const presentNumbers = new Set<string>()

  input.rows.forEach((row, index) => {
    // 1-based data row, so it matches the spreadsheet row the user is looking at.
    const rowNumber = index + 2
    const employeeNumber = (row.employeeNumber ?? '').trim()
    presentNumbers.add(employeeNumber)

    const fail = (code: string, message: string) =>
      hardFailures.push({ severity: 'hardFailure', row: rowNumber, employeeNumber, code, message })
    const warn = (code: string, message: string) =>
      warnings.push({ severity: 'warning', row: rowNumber, employeeNumber, code, message })

    const before = hardFailures.length

    // --- §6.2 identity ------------------------------------------------------
    if (!employeeNumber) {
      fail('missingEmployeeNumber', 'employeeNumber is blank — no join target.')
      return
    }
    if (seenNumbers.has(employeeNumber)) {
      fail('duplicateEmployeeNumber', `${employeeNumber} appears more than once — risk of double payment.`)
      return
    }
    seenNumbers.add(employeeNumber)

    const employee = input.employeesByNumber.get(employeeNumber)
    if (!employee) {
      fail('employeeNotFound', `No employee with number ${employeeNumber}.`)
      return
    }

    const csvPeriod = (row.period ?? '').trim()
    if (csvPeriod !== input.period) {
      fail('periodMismatch', `Row period "${csvPeriod}" does not match the batch period ${input.period}.`)
    }

    // Decision 8's cross-check, softened per the confirmed §14 item 6 decision:
    // enforced only where the employee record actually carries a legacy id.
    const csvLegacy = (row.legacyEmployeeId ?? '').trim()
    if (employee.legacyEmployeeId) {
      if (csvLegacy !== employee.legacyEmployeeId) {
        fail(
          'legacyIdMismatch',
          `legacyEmployeeId "${csvLegacy}" does not match the employee record's "${employee.legacyEmployeeId}".`,
        )
      }
    } else if (csvLegacy) {
      warn(
        'legacyIdUnverified',
        `Employee record has no legacyEmployeeId, so "${csvLegacy}" could not be cross-checked. Backfill it to enable the check.`,
      )
    }

    // §6.2: the only human-readable proof the join landed on the right person.
    const csvName = (row.fullName ?? '').trim()
    if (csvName.toLowerCase() !== employee.fullName.trim().toLowerCase()) {
      fail('nameMismatch', `fullName "${csvName}" does not match the employee record's "${employee.fullName}".`)
    }

    if (input.existingPayslipKeys.has(`${employee.employeeId}::${input.period}`)) {
      fail(
        'payslipExists',
        `A payslip already exists for ${employeeNumber} in ${input.period}. Issue a correction with supersedePayslip instead.`,
      )
    }

    // --- amounts ------------------------------------------------------------
    const discretionary: DiscretionaryInput[] = []
    let badAmount = false
    for (const component of input.components) {
      const amount = amountOf(row, component.csvColumn)
      if (isBadNumber(amount)) {
        fail('nonNumericAmount', `Column "${component.csvColumn}" is not a number.`)
        badAmount = true
        continue
      }
      discretionary.push({
        code: component.code,
        labelId: component.labelId,
        labelEn: component.labelEn,
        type: component.type,
        sortOrder: component.sortOrder,
        amount,
      })
    }

    const statutoryAmounts: Record<string, number> = {}
    for (const [componentId, component] of Object.entries(STATUTORY_COMPONENTS)) {
      const amount = amountOf(row, component.csvColumn)
      if (isBadNumber(amount)) {
        fail('nonNumericAmount', `Column "${component.csvColumn}" is not a number.`)
        badAmount = true
        continue
      }
      statutoryAmounts[componentId] = amount
    }
    if (badAmount) return

    const basicSalary = discretionary.find((c) => c.code === 'BASIC_SALARY')?.amount ?? 0
    const lineItems = expandLineItems(discretionary, statutoryAmounts)
    const bpjsExempt = BPJS_EXEMPT_EMPLOYMENT_STATUSES.has(employee.employmentStatus)

    // --- statutory figures --------------------------------------------------
    //
    // Documented reversal of the design doc's §4.2/§6.4: there is no rate
    // table and nothing is recomputed. Every BPJS line is entered by hand and
    // taken as supplied — payroll is reconciled against the BPJS statement
    // itself, not against a rate this app would have to be told about and kept
    // current with. The row's own arithmetic below is still enforced, so a
    // typo cannot slip through as an unbalanced slip.
    //
    // `statutoryOverrideReason` used to bypass the recompute. With nothing to
    // bypass it is kept only as an audited free-text note on the row.
    const overrideReason = (row[PAYROLL_CSV_OVERRIDE_COLUMN] ?? '').trim()
    if (overrideReason) {
      overriddenRows.push(employeeNumber)
    }

    // --- §6.2 arithmetic ----------------------------------------------------
    // Column totals INCLUDE the mirror, exactly as the source Excel does.
    const totalIncome = sumSide(lineItems, 'income')
    const totalDeduction = sumSide(lineItems, 'deduction')
    const takeHomePay = totalIncome - totalDeduction

    const csvIncome = amountOf(row, 'totalIncome')
    const csvDeduction = amountOf(row, 'totalDeduction')
    const csvTakeHome = amountOf(row, 'takeHomePay')

    if (Math.abs(csvIncome - totalIncome) > STATUTORY_TOLERANCE_IDR) {
      fail('incomeTotalMismatch', `totalIncome ${csvIncome} does not equal the sum of income lines ${totalIncome}.`)
    }
    if (Math.abs(csvDeduction - totalDeduction) > STATUTORY_TOLERANCE_IDR) {
      fail(
        'deductionTotalMismatch',
        `totalDeduction ${csvDeduction} does not equal the sum of deduction lines ${totalDeduction}.`,
      )
    }
    if (Math.abs(csvTakeHome - (csvIncome - csvDeduction)) > STATUTORY_TOLERANCE_IDR) {
      fail(
        'takeHomeMismatch',
        `takeHomePay ${csvTakeHome} does not equal totalIncome - totalDeduction (${csvIncome - csvDeduction}).`,
      )
    }
    if (takeHomePay < 0) {
      fail('negativeTakeHome', `Take home pay is negative (${takeHomePay}).`)
    }

    // Construction invariant: one CSV value expands into both halves of a
    // mirror, so they cannot diverge — asserted anyway, because a silent
    // divergence would break the gross-up invariant §3 depends on.
    for (const pair of mirrorPairAmounts(lineItems)) {
      if (pair.income !== pair.deduction) {
        fail(
          'mirrorPairUnequal',
          `Mirror pair "${pair.pairId}" has unequal halves (${pair.income} vs ${pair.deduction}).`,
        )
      }
    }

    // --- §6.3 warnings ------------------------------------------------------
    if (employee.compensationBasicSalary !== null) {
      const dailyRate = DAILY_RATE_EMPLOYMENT_STATUSES.has(employee.employmentStatus)
      if (dailyRate) {
        // The record is a day rate, so the period figure is expected to be a
        // multiple of it — anything at or above one day's pay is normal. Below
        // it is the case worth naming: a rate pasted in as a period total, or
        // a period with no days worked at all.
        if (basicSalary > 0 && basicSalary < employee.compensationBasicSalary) {
          warn(
            'basicSalaryBelowDailyRate',
            `CSV basic salary ${basicSalary} is less than one day at the compensation record's daily rate of ` +
              `${employee.compensationBasicSalary}. Expected the rate multiplied by the days worked.`,
          )
        }
      } else if (employee.compensationBasicSalary !== basicSalary) {
        warn(
          'basicSalaryDrift',
          `CSV basic salary ${basicSalary} differs from the compensation record's ${employee.compensationBasicSalary}. ` +
            'Legitimate after a mid-period raise.',
        )
      }
    }
    if (employee.status !== 'active' && takeHomePay > 0) {
      warn('inactiveWithPay', `${employee.fullName} is inactive but has pay — expected only for final settlement.`)
    }
    const hasBpjsNumbers = Boolean(employee.bpjsTk || employee.bpjsKesehatan)
    const bpjsPaid = Object.entries(statutoryAmounts).some(
      ([componentId, amount]) => componentId !== 'PPH21' && amount > 0,
    )
    if (bpjsExempt && bpjsPaid) {
      warn(
        'bpjsNotApplicable',
        `${employee.fullName} is ${employee.employmentStatus} and carries no BPJS enrolment, but the row has a ` +
          'non-nil statutory line. Clear it, or move the employee onto a status that is enrolled.',
      )
    }
    if (hasBpjsNumbers && !bpjsPaid && !bpjsExempt) {
      warn(
        'nilBpjsWithMembership',
        `${employee.fullName} has BPJS membership numbers on file but every statutory line is nil — worth checking for an enrolment gap.`,
      )
    }

    if (hardFailures.length > before) return

    drafts.push({
      employee,
      lineItems,
      totalIncome,
      totalDeduction,
      takeHomePay,
      totalEmployerCost: sumEmployerCost(lineItems),
      statutoryOverrideReason: overrideReason || null,
    })
  })

  // §6.3 — someone on the payroll last month who is absent from this file.
  for (const employeeNumber of input.compensationEmployeeNumbers) {
    if (presentNumbers.has(employeeNumber)) continue
    warnings.push({
      severity: 'warning',
      row: 0,
      employeeNumber,
      code: 'absentFromFile',
      message: `${employeeNumber} has a compensation record but no row in this file — a possible omission, or a genuine unpaid month.`,
    })
  }

  return {
    hardFailures,
    warnings,
    overriddenRows,
    drafts,
    totals: {
      totalIncome: drafts.reduce((t, d) => t + d.totalIncome, 0),
      totalDeduction: drafts.reduce((t, d) => t + d.totalDeduction, 0),
      totalTakeHomePay: drafts.reduce((t, d) => t + d.takeHomePay, 0),
      totalEmployerCost: drafts.reduce((t, d) => t + d.totalEmployerCost, 0),
    },
  }
}

function mirrorPairAmounts(items: LineItem[]): { pairId: string; income: number; deduction: number }[] {
  const pairs = new Map<string, { pairId: string; income: number; deduction: number }>()
  for (const item of items) {
    if (!item.pairId) continue
    const pair = pairs.get(item.pairId) ?? { pairId: item.pairId, income: 0, deduction: 0 }
    if (item.side === 'income') pair.income = item.amount
    else pair.deduction = item.amount
    pairs.set(item.pairId, pair)
  }
  return Array.from(pairs.values())
}
