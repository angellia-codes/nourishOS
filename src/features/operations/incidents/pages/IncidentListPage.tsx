import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as incidentService from '../incidentService'
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SEVERITY_VARIANT,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_VARIANT,
  INCIDENT_TYPE_LABELS,
  formatIncidentDateTime,
} from '../incidentFormat'
import type { IncidentReport, IncidentStatus } from '@/types'

const OPEN_STATUSES: IncidentStatus[] = ['reported', 'underReview', 'investigating', 'reopened']

/** Incident Report log — incident-report.md §1/§10. */
export function IncidentListPage() {
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState<IncidentReport[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all')

  useEffect(() => {
    return incidentService.subscribeToIncidentReports(setIncidents)
  }, [])

  if (incidents === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const visible = incidents.filter((incident) => statusFilter === 'all' || incident.status === statusFilter)
  const openCount = incidents.filter((incident) => OPEN_STATUSES.includes(incident.status)).length
  const criticalOpenCount = incidents.filter(
    (incident) => incident.severity === 'critical' && OPEN_STATUSES.includes(incident.status),
  ).length

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Incident Reports</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} open · {criticalOpenCount} critical open
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.INCIDENTS_CREATE}>
          <Button type="button" onClick={() => navigate('/operations/incidents/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Report Incident
          </Button>
        </PermissionGuard>
      </div>

      <div className="max-w-xs">
        <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | IncidentStatus)}>
          <option value="all">All statuses</option>
          {Object.entries(INCIDENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No incidents match"
          description={incidents.length === 0 ? 'Nothing has been reported yet.' : 'Try a different status filter.'}
        />
      ) : (
        visible.map((incident) => (
          <Card
            key={incident.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/operations/incidents/${incident.id}`)}
          >
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{incident.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={INCIDENT_SEVERITY_VARIANT[incident.severity]}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</Badge>
                  <Badge variant={INCIDENT_STATUS_VARIANT[incident.status]}>{INCIDENT_STATUS_LABELS[incident.status]}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{incident.incidentNumber}</span> · {INCIDENT_TYPE_LABELS[incident.incidentType]} ·{' '}
                {incident.location} · {formatIncidentDateTime(incident.occurredAt)}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
