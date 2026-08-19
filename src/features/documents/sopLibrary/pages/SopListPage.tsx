import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Lock, Plus, Settings2 } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, ROLES } from '@/constants'
import { useRole } from '@/hooks'
import * as sopService from '../sopService'
import type { Sop } from '@/types'

const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department.name]),
)

/**
 * The SOP Library — documents.md §6, browse by department. Content is curated
 * by hand by the super admin, so the day-one state is an empty list.
 *
 * Read access is decided by firestore.rules against systemSettings/sopAccess,
 * so a role that isn't on the allowlist surfaces here as a subscription error —
 * that is the real denial, not a client-side check.
 */
export function SopListPage() {
  const navigate = useNavigate()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)

  const [rows, setRows] = useState<Sop[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')

  useEffect(() => {
    return sopService.subscribeToSops(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
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
    const groups = new Map<string, Sop[]>()
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
          description="Your role isn't on the access list for the SOP library. Ask a super admin to add it."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">SOP Library</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} SOP{rows.length === 1 ? '' : 's'} across{' '}
            {new Set(rows.map((row) => row.departmentId)).size} department(s)
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/documents/sop-library/access')}>
              <Settings2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Module Access
            </Button>
            <Button onClick={() => navigate('/documents/sop-library/new')}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add SOP
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
          title="No SOPs yet"
          description={
            rows.length === 0
              ? isSuperAdmin
                ? 'Add the first one — pick a department, give it a number and topic, then paste its Drive link.'
                : 'A super admin has not added any SOPs yet.'
              : 'No SOPs for that department.'
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
                    <p className="font-mono text-xs text-muted-foreground">{row.sopNumber}</p>
                    <p className="truncate font-medium text-foreground">{row.topic}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* noopener/noreferrer: the link points at an external host the super admin typed. */}
                    <a href={row.driveUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" type="button">
                        <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />
                        Open in Drive
                      </Button>
                    </a>
                    {isSuperAdmin && (
                      <Button variant="secondary" onClick={() => navigate(`/documents/sop-library/${row.id}/edit`)}>
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
