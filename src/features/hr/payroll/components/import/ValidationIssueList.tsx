import { AlertTriangle, XCircle } from 'lucide-react'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import type { ValidationIssue } from '@/types'

/**
 * §6.2/§6.3 — one table of validation issues.
 *
 * Hard failures and warnings render identically apart from the heading: the
 * distinction that matters is whether the batch can be created at all, and
 * that is stated once above the list rather than colour-coded per row.
 */
/** ReportTable keys by a single field, and two issues on one row can share a
 *  code, so the index is carried alongside. */
type KeyedIssue = ValidationIssue & { key: string }

const COLUMNS: ReportTableColumn<KeyedIssue>[] = [
  // row 0 is a file-level issue (a bad header, a duplicate upload, someone
  // missing from the file entirely) with no spreadsheet row to point at.
  { header: 'Row', value: (i) => (i.row === 0 ? 'File' : String(i.row)) },
  { header: 'Employee', value: (i) => i.employeeNumber || '—' },
  { header: 'Check', value: (i) => i.code },
  { header: 'Detail', value: (i) => i.message },
]

export function ValidationIssueList({
  issues,
  severity,
}: {
  issues: ValidationIssue[]
  severity: 'hardFailure' | 'warning'
}) {
  const isBlocking = severity === 'hardFailure'

  if (issues.length === 0) {
    return (
      <EmptyState
        title={isBlocking ? 'No blocking problems' : 'No warnings'}
        description={
          isBlocking
            ? 'Every row passed validation, including the statutory recompute.'
            : 'Nothing worth a second look.'
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 text-sm">
        {isBlocking ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        )}
        <span className={isBlocking ? 'text-error' : 'text-muted-foreground'}>
          {isBlocking
            ? `${issues.length} problem(s) must be fixed in the source file before this batch can be created. Nothing has been written.`
            : `${issues.length} warning(s). These do not block the import — review them, then continue if they are expected.`}
        </span>
      </p>
      <ReportTable
        columns={COLUMNS}
        rows={issues.map((issue, index) => ({ ...issue, key: String(index) }))}
        rowKey={(i) => i.key}
      />
    </div>
  )
}
