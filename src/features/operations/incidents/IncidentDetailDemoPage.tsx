import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, ShieldAlert, Wrench } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/hooks'
import { MOCK_INCIDENTS, type IncidentStatus } from './incidentDemoData'
import {
  INCIDENT_NEXT_STATUS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SEVERITY_VARIANT,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_VARIANT,
  INCIDENT_TYPE_LABELS,
  formatIncidentDateTime,
} from './incidentFormat'

/**
 * Incident case file — incident-report.md §4/§5/§8. Mock data; the
 * status-advance button only updates local state.
 */
export function IncidentDetailDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { incidentId } = useParams()

  const incident = MOCK_INCIDENTS.find((entry) => entry.id === incidentId)
  const [status, setStatus] = useState<IncidentStatus>(incident?.status ?? 'reported')

  if (!incident) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Incident not found"
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/demo/operations/incidents')}>
                Back to incidents
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const nextStatus = INCIDENT_NEXT_STATUS[status]

  function handleAdvance() {
    if (!nextStatus) return
    setStatus(nextStatus)
    toast.success(`Status moved to ${INCIDENT_STATUS_LABELS[nextStatus]} (demo) — nothing was written to a backend.`)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Status changes only update this page.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/demo/operations/incidents')}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{incident.title}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{incident.incidentNumber}</span> · {INCIDENT_TYPE_LABELS[incident.incidentType]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={INCIDENT_SEVERITY_VARIANT[incident.severity]}>
              {INCIDENT_SEVERITY_LABELS[incident.severity]}
            </Badge>
            <Badge variant={INCIDENT_STATUS_VARIANT[status]}>{INCIDENT_STATUS_LABELS[status]}</Badge>
          </div>
        </div>

        {incident.incidentType === 'workplaceInjury' && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              Workplace injury — narrative fields are restricted to <code>incidents.view_sensitive</code> (HR Manager, GM,
              Super Admin) per incident-report.md §7. This demo shows them unredacted.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What Happened</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-foreground">{incident.description}</p>
            <div className="grid grid-cols-1 gap-2 text-muted-foreground sm:grid-cols-2">
              <p>Occurred: {formatIncidentDateTime(incident.occurredAt)}</p>
              <p>Location: {incident.location}</p>
              <p>Outlet: {incident.outletId}</p>
              <p>Department: {incident.departmentId}</p>
              <p>Reported by: {incident.reportedByName}</p>
              <p>Assigned to: {incident.assignedToName}</p>
            </div>
            {incident.linkedWorkOrderId && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Wrench className="h-4 w-4" aria-hidden="true" />
                Linked Work Order <span className="font-mono text-foreground">{incident.linkedWorkOrderId}</span> (auto-created
                for equipment failures — incident-report.md §6)
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              {incident.attachmentCount} attachment{incident.attachmentCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People Involved</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {incident.peopleInvolved.length === 0 && incident.witnesses.length === 0 ? (
              <p className="text-muted-foreground">No people or witnesses recorded.</p>
            ) : (
              <>
                {incident.peopleInvolved.map((person) => (
                  <p key={person.name} className="text-foreground">
                    {person.name} <span className="text-muted-foreground">— {person.role}</span>
                  </p>
                ))}
                {incident.witnesses.map((witness) => (
                  <p key={witness.name} className="text-foreground">
                    {witness.name}{' '}
                    <span className="text-muted-foreground">— witness{witness.contact ? ` · ${witness.contact}` : ''}</span>
                  </p>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Immediate Response</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-foreground">{incident.immediateActionTaken}</p>
            <p className="text-muted-foreground">
              Emergency services called: {incident.emergencyServicesCalled ? 'Yes' : 'No'}
            </p>
          </CardContent>
        </Card>

        {incident.resolutionSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Resolution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground">{incident.resolutionSummary}</CardContent>
          </Card>
        )}

        {nextStatus && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleAdvance}>
              Move to {INCIDENT_STATUS_LABELS[nextStatus]}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
