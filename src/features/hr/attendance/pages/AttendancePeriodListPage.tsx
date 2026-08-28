import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleDashed, Lock, Upload } from 'lucide-react'
import { Button, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard, ReportTable, type ReportTableColumn } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as attendanceService from '../attendanceService'
import { formatPeriod, PERIOD_STATUS_DISPLAY } from '../attendanceFormat'
import type { AttendancePeriod } from '@/types'

function buildColumns(onOpen: (periodId: string) => void): ReportTableColumn<AttendancePeriod>[] {
  return [
    { header: 'Period', value: (p) => formatPeriod(p.period) },
    { header: 'Employees', value: (p) => String(p.recordCount), align: 'right' },
    {
      header: 'Status',
      value: (p) => {
        const display = PERIOD_STATUS_DISPLAY[p.status]
        return display ? (
          <StatusPill tone={display.tone} icon={display.icon} label={display.label} />
        ) : (
          <StatusPill tone="neutral" icon={CircleDashed} label={p.status} />
        )
      },
    },
    {
      header: '',
      align: 'right',
      value: (p) => (
        <Button variant="ghost" size="sm" onClick={() => onOpen(p.id)}>
          Open
        </Button>
      ),
    },
  ]
}

/**
 * attendance.md §7/§9 — the period register, and the module's landing page.
 * A month is a period, not a pile of rows: the period is what gets approved,
 * and its records only become readable when it does. Mirrors
 * PayrollBatchListPage.tsx.
 */
export function AttendancePeriodListPage() {
  const navigate = useNavigate()
  const [periods, setPeriods] = useState<AttendancePeriod[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return attendanceService.subscribeToAttendancePeriods(
      (next) => {
        setDenied(false)
        setPeriods(next)
      },
      () => {
        setDenied(true)
        setPeriods([])
      },
    )
  }, [])

  const columns = useMemo(() => buildColumns((periodId) => navigate(`/hr/attendance/periods/${periodId}`)), [navigate])

  if (periods === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Attendance is limited to HR Manager, Finance, GM, Director, Super Admin, and department heads for their own outlet."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            One period per month. Records become readable once the period is approved.
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.ATTENDANCE_IMPORT}>
          <Button onClick={() => navigate('/hr/attendance/import')}>
            <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Import
          </Button>
        </PermissionGuard>
      </div>

      {periods.length === 0 ? (
        <EmptyState title="No attendance periods yet" description="Import a month's CSV to create the first period." />
      ) : (
        <ReportTable columns={columns} rows={periods} rowKey={(p) => p.id} />
      )}
    </div>
  )
}
