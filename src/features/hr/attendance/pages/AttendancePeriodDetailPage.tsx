import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleDashed, RefreshCw, Send } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard, ReportTable, type ReportTableColumn } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { useToast } from '@/hooks'
import * as attendanceService from '../attendanceService'
import { formatPeriod, PERIOD_STATUS_DISPLAY, totalEntitledLeave } from '../attendanceFormat'
import { ValidationIssueList } from '@/features/hr/payroll/components/import'
import type { AttendancePeriod, AttendanceRecord } from '@/types'

/**
 * One period — attendance.md §6/§7. Before approval this is the whole view of
 * the month: the totals and warnings captured at import time (§6.1's review
 * step), since attendanceRecords stay isApproved-gated until then. Mirrors
 * PayrollBatchDetailPage.tsx.
 */
export function AttendancePeriodDetailPage() {
  const { periodId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [period, setPeriod] = useState<AttendancePeriod | null | undefined>(undefined)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!periodId) return
    return attendanceService.subscribeToAttendancePeriod(periodId, setPeriod, () => setPeriod(null))
  }, [periodId])

  useEffect(() => {
    if (!periodId) return
    return attendanceService.subscribeToAttendanceRecords(periodId, setRecords, () => setRecords([]))
  }, [periodId])

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await attendanceService.submitAttendancePeriod(periodId)
      toast.success('Submitted for approval. HR reviews it first.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the period.')
    } finally {
      setSubmitting(false)
    }
  }

  if (period === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (period === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Period not found" description="It may have been removed, or you may not have access." />
      </div>
    )
  }

  const canSubmit = period.status === 'draft' || period.status === 'rejected'
  const canCorrect = period.status === 'approved'

  const columns: ReportTableColumn<AttendanceRecord>[] = [
    { header: 'Employee', value: (r) => r.employeeNumber },
    { header: 'Name', value: (r) => r.employeeNameSnapshot },
    { header: 'Department', value: (r) => r.departmentSnapshot },
    { header: 'WD', value: (r) => String(r.days.WD), align: 'right' },
    { header: 'Entitled leave', value: (r) => String(totalEntitledLeave(r)), align: 'right' },
    { header: 'UL', value: (r) => String(r.days.UL), align: 'right' },
    { header: 'Late', value: (r) => String(r.lateCount), align: 'right' },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/attendance')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{formatPeriod(period.period)}</h1>
            <p className="text-sm text-muted-foreground">
              {period.recordCount} employee(s) · {period.importFileName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <PermissionGuard permission={PERMISSIONS.ATTENDANCE_IMPORT}>
              <Button onClick={handleSubmit} loading={submitting}>
                <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Submit for approval
              </Button>
            </PermissionGuard>
          )}
          {canCorrect && (
            <PermissionGuard permission={PERMISSIONS.ATTENDANCE_IMPORT}>
              <Button
                variant="secondary"
                onClick={() => navigate(`/hr/attendance/import?correcting=${period.period}`)}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                File a correction
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Totals</CardTitle>
          {(() => {
            const display = PERIOD_STATUS_DISPLAY[period.status]
            return display ? (
              <StatusPill tone={display.tone} icon={display.icon} label={display.label} />
            ) : (
              <StatusPill tone="neutral" icon={CircleDashed} label={period.status} />
            )
          })()}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
            <Figure label="Employees" value={String(period.totals.headcount)} />
            <Figure label="Total working days" value={String(period.totals.totalWD)} />
            <Figure label="Entitled leave days" value={String(period.totals.totalEntitledLeave)} />
            <Figure label="Unpaid leave days" value={String(period.totals.totalUL)} />
          </dl>
          {period.supersedesPeriodId && (
            <p className="mt-3 text-xs text-muted-foreground">
              This is a correction — it supersedes the original period once approved.
            </p>
          )}
          {period.supersededByPeriodId && (
            <p className="mt-3 text-xs text-warning">
              This period has been superseded by a correction.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => navigate(`/hr/attendance/periods/${period.supersededByPeriodId}`)}
              >
                View the correction
              </button>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {period.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Warnings from import</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationIssueList issues={period.warnings} severity="warning" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              title={period.status === 'approved' ? 'No records' : 'Records are not readable yet'}
              description={
                period.status === 'approved'
                  ? 'This period is approved but holds no records.'
                  : 'The records exist but stay sealed until the period is approved — that is what the approval authorises.'
              }
            />
          ) : (
            <ReportTable columns={columns} rows={records} rowKey={(r) => r.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
