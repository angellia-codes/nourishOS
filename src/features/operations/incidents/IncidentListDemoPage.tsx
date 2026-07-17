import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { MOCK_INCIDENTS, type IncidentStatus } from './incidentDemoData'
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SEVERITY_VARIANT,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_VARIANT,
  INCIDENT_TYPE_LABELS,
  formatIncidentDateTime,
} from './incidentFormat'

const OPEN_STATUSES: IncidentStatus[] = ['reported', 'underReview', 'investigating', 'reopened']

/**
 * Incident Report log — incident-report.md §1/§10. Mock data, no
 * Firestore/Cloud Function calls.
 */
export function IncidentListDemoPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all')

  const incidents = MOCK_INCIDENTS.filter((incident) => statusFilter === 'all' || incident.status === statusFilter)
  const openCount = MOCK_INCIDENTS.filter((incident) => OPEN_STATUSES.includes(incident.status)).length
  const criticalOpenCount = MOCK_INCIDENTS.filter(
    (incident) => incident.severity === 'critical' && OPEN_STATUSES.includes(incident.status),
  ).length

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls.
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Incident Reports</h1>
            <p className="text-sm text-muted-foreground">
              {openCount} open · {criticalOpenCount} critical open
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/demo/operations/incidents/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Report Incident
          </Button>
        </div>

        <div className="max-w-xs">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | IncidentStatus)}
          >
            <option value="all">All statuses</option>
            {Object.entries(INCIDENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {incidents.length === 0 ? (
          <EmptyState title="No incidents match" description="Try a different status filter." />
        ) : (
          incidents.map((incident) => (
            <Card
              key={incident.id}
              className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
              onClick={() => navigate(`/demo/operations/incidents/${incident.id}`)}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{incident.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={INCIDENT_SEVERITY_VARIANT[incident.severity]}>
                      {INCIDENT_SEVERITY_LABELS[incident.severity]}
                    </Badge>
                    <Badge variant={INCIDENT_STATUS_VARIANT[incident.status]}>
                      {INCIDENT_STATUS_LABELS[incident.status]}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{incident.incidentNumber}</span> · {INCIDENT_TYPE_LABELS[incident.incidentType]} ·{' '}
                  {incident.location} · {formatIncidentDateTime(incident.occurredAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assigned to {incident.assignedToName} · reported by {incident.reportedByName}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
