import { useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { PAYROLL_CSV_COLUMNS } from '@/constants/payroll'
import { downloadCsv, parseCsv, toCsv, type CsvColumn } from '@/utils/csv'
import { hashFileText } from '../../payslipFormat'

export interface UploadedCsv {
  fileName: string
  fileHash: string
  rows: Record<string, string>[]
}

const TEMPLATE_COLUMNS: CsvColumn<Record<string, string>>[] = PAYROLL_CSV_COLUMNS.map((header) => ({
  header,
  value: (row) => row[header] ?? '',
}))

/**
 * §5 — the 32-column template, and the upload that fills it in.
 *
 * Parsing happens client-side with the repo's own parseCsv (still no CSV
 * library on either side); the server receives header-keyed rows. The file's
 * SHA-256 travels with them as §4.4's duplicate-upload guard, computed with
 * native SubtleCrypto rather than a hashing dependency.
 */
export function PayrollCsvUpload({
  period,
  onPeriodChange,
  onFile,
  disabled,
}: {
  period: string
  onPeriodChange: (period: string) => void
  onFile: (csv: UploadedCsv) => void
  disabled?: boolean
}) {
  const [error, setError] = useState<string | null>(null)

  function downloadTemplate() {
    // One blank row under the header, so the file opens ready to fill in.
    const blank = Object.fromEntries(PAYROLL_CSV_COLUMNS.map((column) => [column, '']))
    downloadCsv(toCsv([blank], TEMPLATE_COLUMNS), 'payroll-import-template.csv')
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
      onFile({ fileName: file.name, fileHash: await hashFileText(text), rows })
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
            <Label htmlFor="payroll-period">Period</Label>
            <Input
              id="payroll-period"
              type="month"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              Every employer contribution appears <strong>once</strong> in the file — the importer expands each into
              the pair of lines the slip prints. Totals are cross-checked against the line items, and the nine
              recomputable BPJS contributions are recalculated independently before anything is written.
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
            aria-label="Payroll CSV file"
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-sunken file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          {!period && <p className="text-xs text-muted-foreground">Choose a period first.</p>}
          {error && <p className="text-sm text-error">{error}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Uploading only validates the file. Nothing is written until you create the batch.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
