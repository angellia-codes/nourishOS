import { callFunction } from '@/services/api'
import { subscribeToCollection, subscribeToDocument, getDocument, orderBy, where } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type {
  PayrollBatch,
  PayrollComponent,
  PayrollParameters,
  Payslip,
  ReconciliationReport,
  ValidationIssue,
} from '@/types'

/**
 * Payroll Components & Payslip — payroll-components-payslip-design.md §7.
 *
 * Reads go straight to Firestore, gated by firestore.rules; the spec's
 * `getPayslip`/`listPayslips` callables are deliberately not built, since
 * clients read Firestore directly everywhere else in this codebase. Payslips
 * only become readable once their batch is approved — see the `issuedAt` rule.
 */

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ParsePayrollCsvInput {
  period: string
  sourceFileName: string
  sourceFileHash: string
  rows: Record<string, string>[]
}

/** Writes nothing — the advisory reconciliation preview (§6.1). */
export function parsePayrollCsv(input: ParsePayrollCsvInput): Promise<ReconciliationReport & { sourceFileName: string }> {
  return callFunction('parsePayrollCsv', input)
}

export interface CreatePayrollBatchInput extends ParsePayrollCsvInput {
  outletId?: string | null
}

/**
 * Writes the batch as `draft` plus every payslip, re-validating server-side.
 * Throws rather than partially importing: §6.1 — a partially-failed import
 * must never leave a month half-published.
 */
export function createPayrollBatch(
  input: CreatePayrollBatchInput,
): Promise<{ batchId: string; rowCount: number; warnings: ValidationIssue[] }> {
  return callFunction('createPayrollBatch', input)
}

export function submitPayrollBatch(batchId: string): Promise<{ approvalRequestId: string }> {
  return callFunction('submitPayrollBatch', { batchId })
}

export function supersedePayslip(input: {
  payslipId: string
  amounts: Record<string, number>
  reason: string
}): Promise<{ payslipId: string }> {
  return callFunction('supersedePayslip', input)
}

// ---------------------------------------------------------------------------
// Registry and parameters
// ---------------------------------------------------------------------------

export interface UpsertPayrollComponentInput {
  code: string
  labelId: string
  labelEn: string
  type: 'earning' | 'deduction'
  sortOrder: number
  isActive: boolean
  isTaxable: boolean
}

export function upsertPayrollComponent(input: UpsertPayrollComponentInput): Promise<{ code: string }> {
  return callFunction('upsertPayrollComponent', input)
}

/** Idempotent — an existing component is left alone, never overwritten. */
export function seedPayrollComponents(): Promise<{ created: number }> {
  return callFunction('seedPayrollComponents')
}

export interface UpsertPayrollParametersInput {
  year: number
  jkk: number
  jkm: number
  jhtCompany: number
  jhtEmployee: number
  jpCompany: number
  jpEmployee: number
  bpjsKesCo: number
  bpjsKesEmp: number
  bpjsKesFam: number
  jpWageCeiling: number
  bpjsKesCeiling: number
  effectiveFrom: string
}

export function upsertPayrollParameters(input: UpsertPayrollParametersInput): Promise<{ year: number }> {
  return callFunction('upsertPayrollParameters', input)
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function subscribeToPayrollBatches(
  onChange: (batches: PayrollBatch[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<PayrollBatch>(
    COLLECTIONS.PAYROLL_BATCHES,
    [orderBy('period', 'desc')],
    onChange,
    onError,
  )
}

export function subscribeToPayrollBatch(
  batchId: string,
  onChange: (batch: PayrollBatch | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToDocument<PayrollBatch>(COLLECTIONS.PAYROLL_BATCHES, batchId, onChange, onError)
}

/**
 * Every readable payslip, newest period first, filtered further client-side by
 * the pages.
 *
 * **`where('isIssued','==',true)` is not optional.** firestore.rules gates
 * payslips on that field, and rules do not filter — on a `list` the rule is
 * checked against the query, so a query that omits this filter is denied
 * outright rather than returning the issued subset. Dropping it looks like a
 * harmless simplification and silently empties the page.
 */
export function subscribeToPayslips(
  onChange: (payslips: Payslip[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Payslip>(
    COLLECTIONS.PAYSLIPS,
    [where('isIssued', '==', true), orderBy('period', 'desc')],
    onChange,
    onError,
  )
}

export function subscribeToBatchPayslips(
  batchId: string,
  onChange: (payslips: Payslip[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Payslip>(
    COLLECTIONS.PAYSLIPS,
    // Two equality filters — Firestore auto-indexes these, and the isIssued
    // one is what makes the read rule provable (see above).
    [where('batchId', '==', batchId), where('isIssued', '==', true)],
    onChange,
    onError,
  )
}

export function getPayslip(payslipId: string): Promise<Payslip | null> {
  return getDocument<Payslip>(COLLECTIONS.PAYSLIPS, payslipId)
}

export function subscribeToPayrollComponents(
  onChange: (components: PayrollComponent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<PayrollComponent>(
    COLLECTIONS.PAYROLL_COMPONENTS,
    [orderBy('sortOrder', 'asc')],
    onChange,
    onError,
  )
}

export function getPayrollParameters(year: number): Promise<PayrollParameters | null> {
  return getDocument<PayrollParameters>(COLLECTIONS.PAYROLL_PARAMETERS, String(year))
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ManningCostSummaryRow {
  outletId: string
  periodMonth: string
  totalGross: number
  totalNet: number
  employeeCount: number
}

/**
 * Aggregate-only — raw payslips stay gated to the payroll roles in
 * firestore.rules, and this is how the Manning Budget & Cost report reaches
 * manning cost without touching individual take-home figures.
 */
export function getManningCostSummary(): Promise<ManningCostSummaryRow[]> {
  return callFunction('getManningCostSummary')
}
