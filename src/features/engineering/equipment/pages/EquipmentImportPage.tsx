import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, FileCheck2, XCircle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, Tabs, TabPanel } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { EQUIPMENT_CSV_COLUMNS } from '@/constants'
import { useToast } from '@/hooks'
import { downloadCsv, parseCsv, toCsv, type CsvColumn } from '@/utils/csv'
import * as equipmentService from '../equipmentService'
import type {
  EquipmentImportError,
  EquipmentImportPreview,
  EquipmentImportRow,
  EquipmentImportUpdateRow,
  EquipmentImportWarning,
} from '@/types'

const TEMPLATE_COLUMNS: CsvColumn<Record<string, string>>[] = EQUIPMENT_CSV_COLUMNS.map((header) => ({
  header,
  value: (row) => row[header] ?? '',
}))

const INSERT_COLUMNS: ReportTableColumn<EquipmentImportRow>[] = [
  { header: 'Row', value: (r) => String(r.rowNumber) },
  { header: 'Name', value: (r) => r.name },
  { header: 'Category', value: (r) => r.category },
  { header: 'Outlet', value: (r) => r.outletId },
  { header: 'Area', value: (r) => r.area },
  { header: 'Criticality', value: (r) => `${r.criticality}${r.criticalityOverridden ? ' (override)' : ''}` },
]

const UPDATE_COLUMNS: ReportTableColumn<EquipmentImportUpdateRow>[] = [
  { header: 'Row', value: (r) => String(r.rowNumber) },
  { header: 'Asset code', value: (r) => r.assetCode },
  { header: 'Name', value: (r) => r.name },
  { header: 'Changed fields', value: (r) => (r.changedFields.length ? r.changedFields.join(', ') : 'none') },
]

const ERROR_COLUMNS: ReportTableColumn<EquipmentImportError>[] = [
  { header: 'Row', value: (r) => String(r.rowNumber) },
  { header: 'Column', value: (r) => r.column },
  { header: 'Value', value: (r) => r.value },
  { header: 'Problem', value: (r) => r.message },
]

const WARNING_COLUMNS: ReportTableColumn<EquipmentImportWarning>[] = [
  { header: 'Row', value: (r) => String(r.rowNumber) },
  { header: 'Warning', value: (r) => r.message },
]

/**
 * equipment-master-design.md §4 — upload → preview (writes nothing) → commit.
 * The safe re-import loop (§4.6) is export → edit → re-import, which is why
 * the list page's Export always carries `assetCode` on every row.
 */
export function EquipmentImportPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<Record<string, string>[] | null>(null)
  const [preview, setPreview] = useState<EquipmentImportPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [tab, setTab] = useState<'inserts' | 'updates' | 'errors'>('inserts')
  const [error, setError] = useState<string | null>(null)

  function downloadTemplate() {
    const blank = Object.fromEntries(EQUIPMENT_CSV_COLUMNS.map((column) => [column, '']))
    downloadCsv(toCsv([blank], TEMPLATE_COLUMNS), 'equipment-import-template.csv')
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setPreview(null)
    let parsedRows: Record<string, string>[]
    try {
      const text = await file.text()
      parsedRows = parseCsv(text)
      if (parsedRows.length === 0) {
        setError('The file has no data rows below the header.')
        return
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the file.')
      return
    }

    setFileName(file.name)
    setRows(parsedRows)
    setPreviewing(true)
    try {
      const result = await equipmentService.previewEquipmentImport(parsedRows)
      setPreview(result)
      setTab(result.errors.length > 0 ? 'errors' : result.updates.length > 0 ? 'updates' : 'inserts')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not validate the file.')
      setRows(null)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleCommit() {
    if (!preview || !rows || !preview.canCommit) return
    setCommitting(true)
    try {
      const result = await equipmentService.commitEquipmentImport({
        previewToken: preview.previewToken,
        rows,
        fileName: fileName ?? undefined,
      })
      toast.success(`${result.insertCount} inserted, ${result.updateCount} updated.`)
      navigate('/engineering/assets')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not commit this import.')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/engineering/assets')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Import equipment</h1>
          <p className="text-sm text-muted-foreground">
            Nothing is written until you commit — this is a dry-run preview against the live register.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Get the template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">
            Fill in one row per asset. Leave <code>assetCode</code> blank for a new asset — a re-import that includes it updates
            the matching record instead (§4.6's safe re-import loop: export, edit, re-import).
          </p>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Download template
          </Button>
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
            onChange={(event) => void handleFile(event)}
            disabled={previewing || committing}
            aria-label="Equipment CSV file"
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-sunken file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          {error && <p className="text-sm text-error">{error}</p>}
        </CardContent>
      </Card>

      {previewing && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Spinner />
            <p className="text-sm text-muted-foreground">Validating every row against the live register…</p>
          </CardContent>
        </Card>
      )}

      {preview && !previewing && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>3. Review, then commit</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
            </div>
            <Button onClick={() => void handleCommit()} loading={committing} disabled={!preview.canCommit}>
              <FileCheck2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Commit import
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!preview.canCommit && (
              <p className="flex items-start gap-2 text-sm text-error">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {preview.errors.length} error(s) must be fixed in the source file before this can be committed. Nothing has
                been written.
              </p>
            )}
            {preview.warnings.length > 0 && (
              <p className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {preview.warnings.length} possible duplicate(s) flagged below — review before committing. These do not
                block the import.
              </p>
            )}

            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as typeof tab)}
              items={[
                { value: 'inserts', label: `Inserts (${preview.inserts.length})` },
                { value: 'updates', label: `Updates (${preview.updates.length})` },
                { value: 'errors', label: `Errors (${preview.errors.length})` },
              ]}
            />

            <TabPanel value="inserts" activeValue={tab}>
              {preview.inserts.length === 0 ? (
                <EmptyState title="No new assets" description="Every row in this file matched an existing record." />
              ) : (
                <ReportTable columns={INSERT_COLUMNS} rows={preview.inserts} rowKey={(r) => String(r.rowNumber)} />
              )}
              {preview.warnings.length > 0 && (
                <div className="mt-3">
                  <ReportTable columns={WARNING_COLUMNS} rows={preview.warnings} rowKey={(r) => String(r.rowNumber)} />
                </div>
              )}
            </TabPanel>
            <TabPanel value="updates" activeValue={tab}>
              {preview.updates.length === 0 ? (
                <EmptyState title="No updates" description="No row in this file matched an existing asset code or serial number." />
              ) : (
                <ReportTable columns={UPDATE_COLUMNS} rows={preview.updates} rowKey={(r) => String(r.rowNumber)} />
              )}
            </TabPanel>
            <TabPanel value="errors" activeValue={tab}>
              {preview.errors.length === 0 ? (
                <EmptyState title="No errors" description="Every row passed validation." />
              ) : (
                <ReportTable columns={ERROR_COLUMNS} rows={preview.errors} rowKey={(r) => `${r.rowNumber}-${r.column}`} />
              )}
            </TabPanel>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
