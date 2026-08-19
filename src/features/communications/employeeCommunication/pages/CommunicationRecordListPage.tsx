import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, MessageSquareWarning, Plus } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { CROSS_OUTLET_ROLES, DEPARTMENTS, PERMISSIONS, ROLES } from '@/constants'
import { DISCIPLINARY_TYPE_LABELS } from '@/constants/hr'
import { useAuth, usePermissions } from '@/hooks'
import { formatDate } from '@/utils'
import * as service from '../employeeCommunicationService'
import {
  COMMUNICATION_STATUS_ICON,
  COMMUNICATION_STATUS_LABELS,
  COMMUNICATION_STATUS_TONE,
  describeValidity,
} from '../employeeCommunicationFormat'
import type { CommunicationScope } from '../employeeCommunicationService'
import type { DisciplinaryRecord } from '@/types'

const departmentName = (id: string | null | undefined) =>
  (id ? DEPARTMENTS.find((department) => department.id === id)?.name : null) ?? id ?? '—'

/**
 * employee_communication.md §26 — the communication register.
 *
 * Three different queries rather than one filtered client-side, because the
 * `disciplinaryActions` read rule has three branches and a list query fails in
 * its entirety if a single returned document fails its own rule. HR and elevated
 * roles read everything; a department head reads their own department; everyone
 * else reads the records issued to them.
 *
 * §38's "Pending Review / Active Warnings / Expiring Soon / Archived" nav items
 * are the status filter here rather than four routes — one register, one query.
 */
export function CommunicationRecordListPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { canAny } = usePermissions()

  const [rows, setRows] = useState<DisciplinaryRecord[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // §5.4 — a department head issues for their own team without employees.update.
  const canIssue = canAny([PERMISSIONS.EMPLOYEES_COMMUNICATE, PERMISSIONS.EMPLOYEES_UPDATE])

  const scope = useMemo<CommunicationScope | null>(() => {
    if (!profile || !user) return null
    const seesAll =
      profile.roleId === ROLES.HR_MANAGER || (CROSS_OUTLET_ROLES as readonly string[]).includes(profile.roleId)
    if (seesAll) return { kind: 'all' }
    // A department head's own department — the rule matches on the record's
    // denormalized departmentId against their token claim, so the query has to
    // name the same field.
    if (canIssue && profile.departmentId) return { kind: 'department', departmentId: profile.departmentId }
    return { kind: 'employee', uid: user.uid }
  }, [profile, user, canIssue])

  useEffect(() => {
    if (!scope) return
    return service.subscribeToCommunicationRecords(
      scope,
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [scope])

  const visible = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          (statusFilter === 'all' || row.status === statusFilter) && (typeFilter === 'all' || row.type === typeFilter),
      ),
    [rows, statusFilter, typeFilter],
  )

  const activeCount = useMemo(() => (rows ?? []).filter((row) => row.status === 'active').length, [rows])

  if (rows === null) {
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
          title="Communication records unavailable"
          description="Your account can't read this register. Ask a super admin to check your role."
        />
      </div>
    )
  }

  const isOwnRecordsOnly = scope?.kind === 'employee'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Communication</h1>
          <p className="text-sm text-muted-foreground">
            {isOwnRecordsOnly
              ? 'Communications issued to you'
              : scope?.kind === 'department'
                ? `${departmentName(scope.departmentId)} · ${activeCount} active`
                : `All departments · ${activeCount} active`}
          </p>
        </div>
        {canIssue && (
          <Button onClick={() => navigate('/communications/employee/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Communication
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(COMMUNICATION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by action" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All actions</option>
          {Object.entries(DISCIPLINARY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MessageSquareWarning className="h-8 w-8" aria-hidden="true" />}
          title={rows.length === 0 ? 'No communication records' : 'Nothing matches those filters'}
          description={
            rows.length === 0
              ? isOwnRecordsOnly
                ? 'Nothing has been issued to you.'
                : 'Start one from here, or from an employee profile.'
              : 'Try a different status or action filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((row) => {
            const validity = describeValidity(row)
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/communications/employee/${row.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-mono text-xs text-muted-foreground">{row.employeeNumber ?? 'No number'}</p>
                    <p className="truncate font-medium text-foreground">{row.employeeName ?? row.employeeId}</p>
                    <p className="text-xs text-muted-foreground">
                      {DISCIPLINARY_TYPE_LABELS[row.type]} · {departmentName(row.departmentId)} ·{' '}
                      {formatDate(row.incident?.date ?? row.createdAt)}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusPill
                      tone={COMMUNICATION_STATUS_TONE[row.status]}
                      icon={COMMUNICATION_STATUS_ICON[row.status]}
                      label={COMMUNICATION_STATUS_LABELS[row.status]}
                    />
                    {validity && <span className="text-xs text-muted-foreground">{validity}</span>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
