import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileCheck2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { useToast } from '@/hooks'
import * as attendanceService from '../attendanceService'
import { AttendanceCsvUpload, AttendanceReconciliationPreview, type UploadedAttendanceCsv } from '../components/import'
import type { AttendanceReconciliationReport } from '@/types'

/** 'YYYY-MM' — <input type="month"> already produces exactly this. */
function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * attendance.md §5 — upload → parse → validate → reconciliation preview →
 * create period. Nothing is written until "Create period", and the server
 * re-validates everything at that point. Mirrors PayrollImportPage.tsx.
 *
 * A correction (§6.2) lands here via `?correcting=2026-07` — same route,
 * `isCorrection: true` on commit.
 */
export function AttendanceImportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const correctingPeriod = searchParams.get('correcting')

  const [period, setPeriod] = useState(correctingPeriod ?? currentPeriod)
  const [csv, setCsv] = useState<UploadedAttendanceCsv | null>(null)
  const [report, setReport] = useState<AttendanceReconciliationReport | null>(null)
  const [parsing, setParsing] = useState(false)
  const [creating, setCreating] = useState(false)

  async function handleFile(uploaded: UploadedAttendanceCsv) {
    setCsv(uploaded)
    setReport(null)
    setParsing(true)
    try {
      const result = await attendanceService.previewAttendanceImport({
        period,
        sourceFileName: uploaded.fileName,
        rows: uploaded.rows,
      })
      setReport(result)
    } catch (error) {
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
      const result = await attendanceService.importAttendancePeriod({
        period,
        sourceFileName: csv.fileName,
        sourceFileText: csv.fileText,
        rows: csv.rows,
        isCorrection: Boolean(correctingPeriod),
      })
      toast.success(`Period created with ${result.recordCount} record(s). Submit it to publish.`)
      navigate(`/hr/attendance/periods/${result.periodId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the period.')
    } finally {
      setCreating(false)
    }
  }

  const blocked = report !== null && report.hardFailures.length > 0

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/attendance')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {correctingPeriod ? `Correct ${correctingPeriod}` : 'Import attendance'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {correctingPeriod
              ? 'This replaces the approved period — the original stays on file, superseded.'
              : "Validate a month's recap CSV, then create the period for approval."}
          </p>
        </div>
      </div>

      <AttendanceCsvUpload
        period={period}
        onPeriodChange={(next) => {
          setPeriod(next)
          setCsv(null)
          setReport(null)
        }}
        onFile={handleFile}
        disabled={parsing || creating}
        periodLocked={Boolean(correctingPeriod)}
      />

      {parsing && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Spinner />
            <p className="text-sm text-muted-foreground">Resolving employees and checking the reconciliation…</p>
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
            <Button onClick={handleCreate} loading={creating} disabled={blocked}>
              <FileCheck2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {correctingPeriod ? 'Create correction' : 'Create period'}
            </Button>
          </CardHeader>
          <CardContent>
            <AttendanceReconciliationPreview report={report} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
