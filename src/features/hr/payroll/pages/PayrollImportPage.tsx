import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileCheck2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '@/components/ui'
import { OUTLETS } from '@/constants'
import { useToast } from '@/hooks'
import * as payrollService from '../payrollService'
import { PayrollCsvUpload, ReconciliationPreview, type UploadedCsv } from '../components/import'
import type { ReconciliationReport } from '@/types'

/** 'YYYY-MM' — <input type="month"> already produces exactly this. */
function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * payroll-components-payslip-design.md §6.1 —
 * upload → parse → resolve → validate → reconciliation preview → create batch.
 *
 * Nothing is written until "Create batch", and the server re-validates
 * everything at that point: this preview is advisory, never the gate. A batch
 * with any hard failure is refused outright rather than partially imported —
 * a partially-failed import must never leave a month half-published.
 */
export function PayrollImportPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [period, setPeriod] = useState(currentPeriod)
  const [outletId, setOutletId] = useState('')
  const [csv, setCsv] = useState<UploadedCsv | null>(null)
  const [report, setReport] = useState<ReconciliationReport | null>(null)
  const [parsing, setParsing] = useState(false)
  const [creating, setCreating] = useState(false)

  async function handleFile(uploaded: UploadedCsv) {
    setCsv(uploaded)
    setReport(null)
    setParsing(true)
    try {
      const result = await payrollService.parsePayrollCsv({
        period,
        sourceFileName: uploaded.fileName,
        sourceFileHash: uploaded.fileHash,
        rows: uploaded.rows,
      })
      setReport(result)
    } catch (error) {
      // A thrown error here means the file could not be validated at all —
      // usually missing payroll parameters for the year.
      toast.error(error instanceof Error ? error.message : 'Could not validate the file.')
      setCsv(null)
    } finally {
      setParsing(false)
    }
  }

  async function handleCreate() {
    if (!csv || creating) return
    setCreating(true)
    try {
      const result = await payrollService.createPayrollBatch({
        period,
        outletId: outletId || null,
        sourceFileName: csv.fileName,
        sourceFileHash: csv.fileHash,
        rows: csv.rows,
      })
      toast.success(`Batch created with ${result.rowCount} payslip(s). Submit it to publish.`)
      navigate(`/hr/payroll/batches/${result.batchId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the batch.')
    } finally {
      setCreating(false)
    }
  }

  const blocked = report !== null && report.hardFailures.length > 0

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/payroll')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Import payroll</h1>
          <p className="text-sm text-muted-foreground">
            Validate a month's computed payslips, then create the batch for approval.
          </p>
        </div>
      </div>

      <PayrollCsvUpload
        period={period}
        onPeriodChange={(next) => {
          setPeriod(next)
          setCsv(null)
          setReport(null)
        }}
        onFile={handleFile}
        disabled={parsing || creating}
      />

      {parsing && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Spinner />
            <p className="text-sm text-muted-foreground">
              Resolving employees and recomputing statutory contributions…
            </p>
          </CardContent>
        </Card>
      )}

      {report && !parsing && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>3. Review the reconciliation</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{csv?.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                aria-label="Scope this batch to an outlet"
                className="max-w-48"
              >
                <option value="">All outlets</option>
                {OUTLETS.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
              <Button onClick={handleCreate} loading={creating} disabled={blocked}>
                <FileCheck2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Create batch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReconciliationPreview report={report} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
