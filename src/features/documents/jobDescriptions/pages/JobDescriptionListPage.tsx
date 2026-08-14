import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Lock, Plus, Settings2 } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, ROLES, ROLE_LABELS } from '@/constants'
import { useRole } from '@/hooks'
import * as jobDescriptionService from '../jobDescriptionService'
import type { JobDescription } from '@/types'

const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department.name]),
)

/**
 * The Job Descriptions register — documents.md §5. Content is curated by hand
 * by the super admin, so the day-one state is an empty list rather than a
 * seeded one, and the empty copy says as much.
 *
 * Read access is decided by firestore.rules against
 * systemSettings/jobDescriptionAccess, so a role that isn't on the allowlist
 * surfaces here as a subscription error — that is the real denial, not a
 * client-side check we could be talked out of.
 */
export function JobDescriptionListPage() {
  const navigate = useNavigate()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)

  const [rows, setRows] = useState<JobDescription[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')

  useEffect(() => {
    return jobDescriptionService.subscribeToJobDescriptions(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        // Lost & Found drops its subscription errors and hangs on the spinner
        // forever; don't copy that here — a rules denial is the expected path
        // for anyone not on the allowlist.
        setDenied(true)
        setRows([])
      },
    )
  }, [])

  const visible = useMemo(
    () => (rows ?? []).filter((row) => departmentFilter === 'all' || row.departmentId === departmentFilter),
    [rows, departmentFilter],
  )

  /** Department id → its rows, in the order the query already returned them. */
  const grouped = useMemo(() => {
    const groups = new Map<string, JobDescription[]>()
    for (const row of visible) {
      const existing = groups.get(row.departmentId)
      if (existing) existing.push(row)
      else groups.set(row.departmentId, [row])
    }
    return [...groups.entries()]
  }, [visible])

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
          title="Access restricted"
          description="Your role isn't on the access list for job descriptions. Ask a super admin to add it."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Job Descriptions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} job description{rows.length === 1 ? '' : 's'} across{' '}
            {new Set(rows.map((row) => row.departmentId)).size} department(s)
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/documents/job-descriptions/access')}>
              <Settings2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Module Access
            </Button>
            <Button onClick={() => navigate('/documents/job-descriptions/new')}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add Job Description
            </Button>
          </div>
        )}
      </div>

      {/* The chevron is positioned against the Select's own wrapper, so constrain
          the width from outside rather than via className on the select itself. */}
      <div className="sm:max-w-xs">
        <Select
          aria-label="Filter by department"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">All departments</option>
          {DEPARTMENTS.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title="No job descriptions yet"
          description={
            rows.length === 0
              ? isSuperAdmin
                ? 'Add the first one — pick a department and role, then paste the link to its PDF.'
                : 'A super admin has not added any job descriptions yet.'
              : 'No job descriptions for that department.'
          }
        />
      ) : (
        grouped.map(([departmentId, departmentRows]) => (
          <section key={departmentId} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {DEPARTMENT_NAMES[departmentId] ?? departmentId}
            </h2>
            {departmentRows.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{ROLE_LABELS[row.roleId] ?? row.roleId}</p>
                    <p className="truncate text-sm text-muted-foreground">{row.title}</p>
                    {row.notes && <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* noopener/noreferrer: the link points at an external host the super admin typed. */}
                    <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" type="button">
                        <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />
                        Open PDF
                      </Button>
                    </a>
                    {isSuperAdmin && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/documents/job-descriptions/${row.id}/edit`)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
