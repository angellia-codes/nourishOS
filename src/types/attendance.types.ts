import type { BaseDocument } from './firestore.types'
import type { ValidationIssue } from './payroll.types'

/**
 * Attendance — attendance.md §2/§3. A monthly aggregate ledger: one period
 * document per calendar month, one record per employee per period. Not a
 * time-and-attendance system — no punch times, no daily grid (§1.2).
 *
 * Timestamps arrive as ISO strings, never `Timestamp` — same convention every
 * other type in this file follows (src/services/firestore/normalize.ts).
 */

// ---------------------------------------------------------------------------
// §2 — the nine-code taxonomy
// ---------------------------------------------------------------------------

export type AttendanceCode = 'WD' | 'PH' | 'DP' | 'AL' | 'MC' | 'EO' | 'SL' | 'DO' | 'UL'

export type AttendanceCodeClass =
  | 'worked' // employee was at work
  | 'rest' // scheduled non-working day, not consumed from any entitlement
  | 'leaveEntitled' // paid absence drawn against an entitlement
  | 'leaveUnpaid' // unpaid absence — the only absenteeism input (D2)

export interface AttendanceDayCounts {
  WD: number
  PH: number
  DP: number
  AL: number
  MC: number
  EO: number
  SL: number
  DO: number
  UL: number
}

// ---------------------------------------------------------------------------
// §3.1 — period, company-wide (D3)
// ---------------------------------------------------------------------------

export type AttendancePeriodStatus =
  | 'draft'
  | 'submitted'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'closed'

export interface AttendancePeriod extends BaseDocument {
  /**
   * The document id equals `period` ('YYYY-MM') for a month's first-ever
   * import — the natural dedup key, and what makes V8 a plain existence
   * check. A correction (§6.2) creates a SECOND document for the same month
   * — "YYYY-MM" is already taken by the original — so it gets an
   * auto-generated id instead. `period` is the field every query/sort/filter
   * actually uses; never assume the doc id matches it.
   */
  id: string
  /** 'YYYY-MM' — stored explicitly since a correction's doc id isn't this. */
  period: string
  year: number
  month: number
  daysInMonth: number
  status: AttendancePeriodStatus
  recordCount: number
  /**
   * Captured at import time, same as PayrollBatch.totals/reconciliation.
   * attendanceRecords are isApproved-gated and unreadable pre-approval, so
   * without this the approval step ("review aggregates and warnings", §6.1)
   * would have nothing to review — the period doc itself has to carry it.
   */
  totals: AttendanceAggregateTotals
  warnings: ValidationIssue[]
  importedAt: string | null
  importedBy: string | null
  importFileName: string | null
  /** File Storage Service reference to the archived source CSV (§9). */
  importFileId: string | null
  /** §6.2 — set on a correction re-import. */
  supersedesPeriodId: string | null
  /** §6.2 — set on the original once superseded. */
  supersededByPeriodId: string | null
  approvalRequestId: string | null
}

// ---------------------------------------------------------------------------
// §3.2 — record, one per employee per period
// ---------------------------------------------------------------------------

export interface AttendanceRecord extends BaseDocument {
  periodId: string
  employeeId: string
  /** 'N0001' — the CSV match key (§4.2). */
  employeeNumber: string

  // Snapshot block — denormalised deliberately so an approved period never
  // changes because the employee later transferred outlet/department (§3.2).
  employeeNameSnapshot: string
  departmentSnapshot: string
  outletIdSnapshot: string
  employmentStatusSnapshot: string

  days: AttendanceDayCounts
  /** Pre-normalisation column names seen for this row, audit only (§2.2). */
  rawCodesSeen: string[]
  /** Punctuality — incident count, NOT minutes. */
  lateCount: number

  /** Σ days.* — must equal the parent period's daysInMonth (V5). */
  totalDays: number

  /**
   * Stamped true only once the 'people/attendancePeriod' approval resolves —
   * the same isIssued-style gate payslips use, and for the same reason:
   * nobody (including outlet-scoped leaders) should see a figure that might
   * still be rejected or corrected. firestore.rules reads this field directly
   * rather than a parent-doc get(), the same reasoning Payslip.isIssued's own
   * doc comment gives.
   */
  isApproved: boolean
}

// ---------------------------------------------------------------------------
// §5 — import validation. Same shape as Payroll's own ValidationIssue
// (severity/row/employeeNumber/code/message) — reused rather than duplicated,
// which also means ValidationIssueList (src/features/hr/payroll/components/import)
// renders attendance's issues with no adapter.
// ---------------------------------------------------------------------------

export interface AttendanceAggregateTotals {
  headcount: number
  totalWD: number
  /** Σ (PH + DP + AL + MC + EO + SL) across the file. */
  totalEntitledLeave: number
  totalUL: number
  totalLateIncidents: number
}

/** What `previewAttendanceImport` returns and `importAttendancePeriod` re-derives server-side. */
export interface AttendanceReconciliationReport {
  period: string
  daysInMonth: number
  rowCount: number
  sourceFileName: string
  hardFailures: ValidationIssue[]
  warnings: ValidationIssue[]
  /** Every alias substitution folded per §2.2, for the W6 warning list. */
  aliasSubstitutions: string[]
  totals: AttendanceAggregateTotals
  /** Same shape as `totals`, for the previous approved period — §5.3's order-of-magnitude diff. */
  previousTotals: AttendanceAggregateTotals | null
}
