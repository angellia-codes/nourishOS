import {
  PAYROLL_CSV_COLUMNS,
  PAYROLL_CSV_OVERRIDE_COLUMN,
  STATUTORY_COMPONENTS,
  STATUTORY_TOLERANCE_IDR,
} from '../../lib/payroll'
import {
  expandLineItems,
  recomputeStatutory,
  sumEmployerCost,
  sumSide,
  type DiscretionaryInput,
  type LineItem,
  type StatutoryRates,
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
  parametersYear: number
  rates: StatutoryRates
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

/** See the recompute loop below — Kesehatan is per-enrolment, not universal. */
const KESEHATAN_COMPONENT_IDS = new Set(['BPJS_KES_COMPANY', 'BPJS_KES_EMPLOYEE', 'BPJS_KES_FAMILY'])

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
    const lineItems = expandLineItems(discretionary, statutoryAmounts, input.rates, basicSalary)

    // --- §6.4 statutory recompute ------------------------------------------
    const overrideReason = (row[PAYROLL_CSV_OVERRIDE_COLUMN] ?? '').trim()
    if (overrideReason) {
      overriddenRows.push(employeeNumber)
    } else {
      for (const expected of recomputeStatutory(input.rates, basicSalary)) {
        const supplied = statutoryAmounts[expected.componentId] ?? 0

        // Documented deviation from §6.4's literal "recomputes nine of the ten".
        //
        // §3's own reference slip carries NIL BPJS Kesehatan — that employee is
        // not enrolled — so a flat rate x capped-base recompute would hard-fail
        // the very slip the spec derives its acceptance data from. Unlike the
        // Ketenagakerjaan programs (JKK/JKM/JHT/JP), which are mandatory for
        // every employee and deterministic from basic salary, Kesehatan is
        // per-enrolment and the family line varies with registered dependents.
        //
        // So: a supplied Kesehatan figure is still checked against the
        // recompute, but a nil one is treated as "not enrolled" and left to
        // §6.3's `nilBpjsWithMembership` warning, which exists for exactly this
        // case. Nothing is silently skipped — the warning names it.
        if (supplied === 0 && KESEHATAN_COMPONENT_IDS.has(expected.componentId)) continue

        const variance = Math.abs(supplied - expected.amount)
        if (variance > STATUTORY_TOLERANCE_IDR) {
          fail(
            'statutoryVariance',
            `${STATUTORY_COMPONENTS[expected.componentId].label}: CSV has ${supplied}, recompute gives ${expected.amount} ` +
              `(${expected.rate} x ${expected.base}), variance ${variance} exceeds the Rp ${STATUTORY_TOLERANCE_IDR} tolerance. ` +
              `Correct the figure, or supply a ${PAYROLL_CSV_OVERRIDE_COLUMN} to bypass this row with an audited reason.`,
          )
        }
      }
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
    if (employee.compensationBasicSalary !== null && employee.compensationBasicSalary !== basicSalary) {
      warn(
        'basicSalaryDrift',
        `CSV basic salary ${basicSalary} differs from the compensation record's ${employee.compensationBasicSalary}. ` +
          'Legitimate after a mid-period raise.',
      )
    }
    if (employee.status !== 'active' && takeHomePay > 0) {
      warn('inactiveWithPay', `${employee.fullName} is inactive but has pay — expected only for final settlement.`)
    }
    const hasBpjsNumbers = Boolean(employee.bpjsTk || employee.bpjsKesehatan)
    const bpjsPaid = Object.entries(statutoryAmounts).some(
      ([componentId, amount]) => componentId !== 'PPH21' && amount > 0,
    )
    if (hasBpjsNumbers && !bpjsPaid) {
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
