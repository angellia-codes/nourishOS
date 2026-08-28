import { callFunction } from '@/services/api'
import { subscribeToCollection, subscribeToDocument, orderBy, where } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { AttendancePeriod, AttendanceReconciliationReport, AttendanceRecord } from '@/types'

/**
 * Attendance — attendance.md §7. Reads go straight to Firestore, gated by
 * firestore.rules; there is no `getAttendancePeriod`/`listAttendanceRecords`
 * callable, matching how the rest of this codebase reads (Payroll's own
 * service file makes the same call for the identical reason).
 */

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface PreviewAttendanceImportInput {
  period: string
  sourceFileName: string
  rows: Record<string, string>[]
}

/** Writes nothing — the advisory reconciliation preview (§5.3). */
export function previewAttendanceImport(input: PreviewAttendanceImportInput): Promise<AttendanceReconciliationReport> {
  return callFunction('previewAttendanceImport', input)
}

export interface ImportAttendancePeriodInput extends PreviewAttendanceImportInput {
  sourceFileText: string
  isCorrection?: boolean
}

/**
 * Writes the period and every record, re-validating server-side. Throws
 * rather than partially importing — nothing is written on a hard failure.
 */
export function importAttendancePeriod(
  input: ImportAttendancePeriodInput,
): Promise<{ periodId: string; recordCount: number }> {
  return callFunction('importAttendancePeriod', input)
}

export function submitAttendancePeriod(periodId: string): Promise<{ approvalRequestId: string }> {
  return callFunction('submitAttendancePeriod', { periodId })
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function subscribeToAttendancePeriods(
  onChange: (periods: AttendancePeriod[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<AttendancePeriod>(
    COLLECTIONS.ATTENDANCE_PERIODS,
    [orderBy('period', 'desc')],
    onChange,
    onError,
  )
}

export function subscribeToAttendancePeriod(
  periodId: string,
  onChange: (period: AttendancePeriod | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToDocument<AttendancePeriod>(COLLECTIONS.ATTENDANCE_PERIODS, periodId, onChange, onError)
}

/**
 * A period's readable records. **`where('isApproved','==',true)` is not
 * optional** — firestore.rules gates every record on that field, and rules do
 * not filter: on a `list` the rule is checked against the query, so a query
 * that omits this filter is denied outright rather than returning the
 * approved subset. Same gotcha payslips' own subscribeToPayslips carries.
 */
export function subscribeToAttendanceRecords(
  periodId: string,
  onChange: (records: AttendanceRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<AttendanceRecord>(
    COLLECTIONS.ATTENDANCE_RECORDS,
    [where('periodId', '==', periodId), where('isApproved', '==', true)],
    onChange,
    onError,
  )
}
