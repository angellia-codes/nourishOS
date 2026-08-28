import { useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { downloadCsv, parseCsv, toCsv, type CsvColumn } from '@/utils/csv'
import { ATTENDANCE_CSV_COLUMNS } from '@/constants/attendance'

export interface UploadedAttendanceCsv {
  fileName: string
  fileText: string
  rows: Record<string, string>[]
}

const TEMPLATE_COLUMNS: CsvColumn<Record<string, string>>[] = ATTENDANCE_CSV_COLUMNS.map((header) => ({
  header,
  value: (row) => row[header] ?? '',
}))

/**
 * attendance.md §4 — the 14-column template, and the upload that fills it in.
 *
 * Parsing happens client-side with the repo's own parseCsv; the server
 * receives header-keyed rows plus the raw file text (archived to Storage on
 * commit, §9) — mirrors PayrollCsvUpload.tsx, minus the file-hash dedup
 * (attendance dedups by period, not by file — see importAttendancePeriod's V8).
 */
export function AttendanceCsvUpload({
  period,
  onPeriodChange,
  onFile,
  disabled,
  periodLocked,
}: {
  period: string
  onPeriodChange: (period: string) => void
  onFile: (csv: UploadedAttendanceCsv) => void
  disabled?: boolean
  /** Fixed to the target month when correcting an approved period (§6.2) — the period picker itself is what's locked, not the file input. */
  periodLocked?: boolean
}) {
  const [error, setError] = useState<string | null>(null)

  function downloadTemplate() {
    const blank = Object.fromEntries(ATTENDANCE_CSV_COLUMNS.map((column) => [column, '']))
    downloadCsv(toCsv([blank], TEMPLATE_COLUMNS), 'attendance-import-template.csv')
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setError('The file has no data rows below the header.')
        return
      }
      onFile({ fileName: file.name, fileText: text, rows })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the file.')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>1. Choose the period and get the template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="max-w-xs">
            <Label htmlFor="attendance-period">Period</Label>
            <Input
              id="attendance-period"
              type="month"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              disabled={disabled || periodLocked}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              One row per employee for the month. `employee_number` is the sole match key — never the name.
            </p>
            <Button variant="secondary" onClick={downloadTemplate} disabled={disabled}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Download template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload the filled-in file</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            disabled={disabled || !period}
            aria-label="Attendance CSV file"
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-sunken file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          {!period && <p className="text-xs text-muted-foreground">Choose a period first.</p>}
          {error && <p className="text-sm text-error">{error}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Uploading only validates the file. Nothing is written until you create the period.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
