import type { BaseDocument } from './firestore.types'
import type { TaxStatus } from '@/constants/hr'
import type { ComponentSide } from '@/constants/payroll'

/**
 * Payroll Components & Payslip — payroll-components-payslip-design.md §4.
 *
 * Timestamps arrive as ISO strings, never `Timestamp`: every read passes
 * through src/services/firestore/normalize.ts. The spec types `issuedAt` as a
 * Timestamp because that is what Cloud Functions write; on this side it is a
 * string, same as every other date in this codebase.
 */

// ---------------------------------------------------------------------------
// SUPERSEDED (2026-08-26) — the flat one-doc-per-employee-per-period model the
// 2026-08-25 payroll pass shipped, kept because `payrollRecords` documents
// already written stay readable as history. Nothing writes a PayrollRecord any
// more: `importPayroll` was retired in favour of the batch/payslip model below.
// ---------------------------------------------------------------------------

/** One payroll row per employee per period. Deterministic id `${employeeId}_${periodMonth}`. */
export interface PayrollRecord extends BaseDocument {
  employeeId: string
  employeeNumber: string
  /** 'YYYY-MM'. */
  periodMonth: string

  basicSalary: number
  positionAllowance: number
  phoneAllowance: number
  transportationAllowance: number
  otherAllowance: number
  /** Server-computed, never trusted from the CSV. */
  grossPay: number

  bpjsKesehatanDeduction: number
  bpjsKetenagakerjaanDeduction: number
  pph21: number
  loanDeduction: number
  otherDeduction: number
  /** Server-computed. */
  totalDeductions: number
  /** Server-computed: grossPay - totalDeductions. */
  netPay: number

  notes: string | null
  // outletId/departmentId come from BaseDocument; importPayroll wrote null when
  // the employee had neither, which normalizes to undefined on the way out.
}

/**
 * Manual monthly revenue entry — no POS integration exists anywhere in this
 * app to source it automatically. Deterministic id `${outletId}_${periodMonth}`;
 * re-entering a period corrects it via full overwrite. Still live: the Manning
 * Budget & Cost report reads it alongside the payroll rollup.
 */
export interface MonthlyRevenue extends BaseDocument {
  outletId: string
  periodMonth: string
  amount: number
  updatedBy: string
}

// ---------------------------------------------------------------------------
// §4.3 — discretionary registry (HR-configurable)
// ---------------------------------------------------------------------------

export interface PayrollComponent extends BaseDocument {
  /** 'BASIC_SALARY' — stable, used as the CSV column key. */
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  csvColumn: string
  /** Deletion is soft only — historical payslips hold componentId references. */
  isActive: boolean
  /** Reserved for the future tax engine; not read in v1. */
  isTaxable: boolean
}

// ---------------------------------------------------------------------------
// §4.2 — annual statutory values, one document per calendar year
// ---------------------------------------------------------------------------

export interface PayrollParameters extends BaseDocument {
  year: number
  /** Varies by industry risk class — see §14 open item 4 before trusting a default. */
  jkk: number
  jkm: number
  jhtCompany: number
  jhtEmployee: number
  jpCompany: number
  jpEmployee: number
  bpjsKesCo: number
  bpjsKesEmp: number
  bpjsKesFam: number
  /** §3: Jaminan Pensiun uses a statutory wage ceiling, never basic salary. */
  jpWageCeiling: number
  bpjsKesCeiling: number
  effectiveFrom: string
}

// ---------------------------------------------------------------------------
// §6 — validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'hardFailure' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  /** 1-based CSV data row, matching what the user sees in a spreadsheet. */
  row: number
  employeeNumber: string
  /** Machine-readable check id, e.g. 'statutoryVariance' — greppable in tests. */
  code: string
  message: string
}

/** What `parsePayrollCsv` returns and `createPayrollBatch` re-derives server-side. */
export interface ReconciliationReport {
  period: string
  parametersYear: number
  rowCount: number
  hardFailures: ValidationIssue[]
  warnings: ValidationIssue[]
  /** employeeNumbers whose statutory recompute was bypassed with a reason (§6.4). */
  overriddenRows: string[]
  totals: PayrollBatchTotals
}

// ---------------------------------------------------------------------------
// §4.4 — batch
// ---------------------------------------------------------------------------

export interface PayrollBatchTotals {
  totalIncome: number
  totalDeduction: number
  totalTakeHomePay: number
  /** Sum of the mirror income lines — the employer's own contribution cost. */
  totalEmployerCost: number
}

export type PayrollBatchStatus =
  | 'draft'
  | 'submitted'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'completed'

export interface PayrollBatch extends BaseDocument {
  /** 'YYYY-MM'. */
  period: string
  /**
   * Optional scoping; omitted for an all-outlet batch. Declared by
   * BaseDocument as `outletId?: string` — the server writes null, which the
   * read layer surfaces as absent.
   */
  parametersYear: number
  rowCount: number
  sourceFileName: string
  /** SHA-256 of the uploaded file text — rejects a duplicate re-upload (§6.2). */
  sourceFileHash: string
  totals: PayrollBatchTotals
  reconciliation: {
    hardFailures: ValidationIssue[]
    warnings: ValidationIssue[]
    overriddenRows: string[]
  }
  status: PayrollBatchStatus
  approvalRequestId?: string | null
}

// ---------------------------------------------------------------------------
// §4.5 — payslip, immutable after the batch reaches `approved`
// ---------------------------------------------------------------------------

export interface PayslipLineItem {
  /** 'BASIC_SALARY' | 'JHT_COMPANY' — a component code, not a document id. */
  componentId: string
  labelId: string
  labelEn: string
  side: Exclude<ComponentSide, 'both'>
  /** 0 renders as '-' or blank, never suppressed (§10). */
  amount: number
  rate: number | null
  base: number | null
  /**
   * §4.5 — the integrity guardrail for decision 3. The mirror inflates BOTH
   * column totals by design; any consumer needing honest figures filters
   * `isEmployerMirror === false`. Without this flag the mirror would be
   * unrecoverable from stored data.
   */
  isEmployerMirror: boolean
  pairId: string | null
  sortOrder: number
}

export interface Payslip extends BaseDocument {
  batchId: string
  period: string

  // Identity — resolved from the employee record at import, then frozen (decision 7).
  employeeId: string
  /** Denormalized for future ESS rule-scoping; null until account linking exists. */
  employeeUid: string | null
  employeeNumber: string
  legacyEmployeeId: string | null
  fullName: string
  outletId: string
  outletName: string
  position: string
  taxStatus: TaxStatus | null

  /** Labels are denormalized onto every line — the renderer performs no lookups. */
  lineItems: PayslipLineItem[]

  totalIncome: number
  totalDeduction: number
  takeHomePay: number
  totalEmployerCost: number

  parametersYear: number
  statutoryOverrideReason: string | null
  /**
   * Stamped once, by the approval-resolved handler, on every payslip in an
   * approved batch. §4.5.
   */
  issuedAt: string | null
  /**
   * The rules-queryable mirror of `issuedAt != null`, and the shipped
   * expression of §8's "readable only when the parent batch is approved".
   *
   * Why a second field rather than testing `issuedAt` directly: Firestore
   * rules do not filter, they validate. On a `list` query the rule is checked
   * against the QUERY, not each document, so a rule reading
   * `resource.data.issuedAt != null` denies every list that does not itself
   * constrain `issuedAt` — which is every list a page would naturally run.
   * An equality filter (`where('isIssued','==',true)`) is provable, so the
   * same guarantee holds and the queries actually work.
   */
  isIssued: boolean
  supersedesPayslipId: string | null
  supersededByPayslipId: string | null
}
