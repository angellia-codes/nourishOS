import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { orderBy, where } from 'firebase/firestore'
import { ArrowLeft, ShieldAlert, Wrench } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, Textarea } from '@/components/ui'
import { EmptyState, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { useFirestoreDoc, useFirestoreQuery, usePermissions, useRole, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import * as incidentService from '../incidentService'
import {
  INCIDENT_NEXT_STATUS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SEVERITY_VARIANT,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_VARIANT,
  INCIDENT_TYPE_LABELS,
  formatIncidentDateTime,
} from '../incidentFormat'
import type { FileMetadata, IncidentReport } from '@/types'

export function IncidentDetailPage() {
  const { incidentId } = useParams<{ incidentId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: incident, loading } = useFirestoreDoc<IncidentReport>(COLLECTIONS.INCIDENT_REPORTS, incidentId)
  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    incidentId
      ? [
          where('resourceType', '==', 'incidentReport'),
          where('resourceId', '==', incidentId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [incidentId],
  )

  const { roleId } = useRole()
  const { can } = usePermissions()
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [showReopen, setShowReopen] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!incident) {
    return (
      <EmptyState
        title="Incident not found"
        action={
          <Button type="button" variant="secondary" onClick={() => navigate('/operations/incidents')}>
            Back to incidents
          </Button>
        }
      />
    )
  }

  const nextStatus = INCIDENT_NEXT_STATUS[incident.status]
  const requiresResolutionSummary = nextStatus === 'resolved'

  async function handleAdvance() {
    if (!nextStatus || !incident) return
    if (requiresResolutionSummary && !resolutionSummary.trim()) return
    setAdvancing(true)
    try {
      await incidentService.updateIncidentStatus({
        incidentId: incident.id,
        status: nextStatus,
        resolutionSummary: requiresResolutionSummary ? resolutionSummary : undefined,
      })
      toast.success(`Status moved to ${INCIDENT_STATUS_LABELS[nextStatus]}.`)
    } catch {
      toast.error('Failed to update status. Please try again.')
    } finally {
      setAdvancing(false)
    }
  }

  async function handleReopen() {
    if (!reopenReason.trim() || !incident) return
    setAdvancing(true)
    try {
      await incidentService.reopenIncident(incident.id, reopenReason)
      toast.success('Incident reopened.')
      setShowReopen(false)
      setReopenReason('')
    } catch {
      toast.error('Failed to reopen incident. Please try again.')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/incidents')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{incident.title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{incident.incidentNumber}</span> · {INCIDENT_TYPE_LABELS[incident.incidentType]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={INCIDENT_SEVERITY_VARIANT[incident.severity]}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</Badge>
          <Badge variant={INCIDENT_STATUS_VARIANT[incident.status]}>{INCIDENT_STATUS_LABELS[incident.status]}</Badge>
        </div>
      </div>

      {incident.incidentType === 'workplaceInjury' && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            Workplace injury — visibility of this record is already restricted at the Firestore rules layer to the reporter, the
            routed HR Manager, and elevated roles (incident-report.md §7).
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
          </div>
          {incident.linkedWorkOrderId && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Wrench className="h-4 w-4" aria-hidden="true" />
              Linked Work Order <span className="font-mono text-foreground">{incident.linkedWorkOrderId}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {(incident.peopleInvolved.length > 0 || incident.witnesses.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>People Involved</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {incident.peopleInvolved.map((person) => (
              <p key={person.name} className="text-foreground">
                {person.name} <span className="text-muted-foreground">— {person.role}</span>
              </p>
            ))}
            {incident.witnesses.map((witness) => (
              <p key={witness.name} className="text-foreground">
                {witness.name} <span className="text-muted-foreground">— witness{witness.contact ? ` · ${witness.contact}` : ''}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Immediate Response</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{incident.immediateActionTaken}</p>
          <p className="text-muted-foreground">Emergency services called: {incident.emergencyServicesCalled ? 'Yes' : 'No'}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FileList files={attachments} />
          <FileUpload module="operations" resourceType="incidentReport" resourceId={incident.id} />
        </CardContent>
      </Card>

      {/* updateIncidentStatus allows either the routed assignee or incidents.manage — mirror both here, not just the permission. */}
      {(roleId === incident.assignedToRole || can(PERMISSIONS.INCIDENTS_MANAGE)) && (
        <>
          {requiresResolutionSummary && (
            <div className="flex flex-col gap-1.5">
              <Textarea
                placeholder="Resolution summary (required to resolve) *"
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
              />
            </div>
          )}
          {nextStatus && (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={advancing || (requiresResolutionSummary && !resolutionSummary.trim())}
                onClick={handleAdvance}
              >
                {advancing ? <Spinner className="h-4 w-4" /> : `Move to ${INCIDENT_STATUS_LABELS[nextStatus]}`}
              </Button>
            </div>
          )}
        </>
      )}

      <PermissionGuard permission={PERMISSIONS.INCIDENTS_MANAGE}>
        {incident.status === 'closed' && !showReopen && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowReopen(true)}>
              Reopen
            </Button>
          </div>
        )}
        {showReopen && (
          <Card>
            <CardHeader>
              <CardTitle>Reopen Incident</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea placeholder="Reason for reopening *" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" variant="secondary" disabled={advancing || !reopenReason.trim()} onClick={handleReopen}>
                  {advancing ? <Spinner className="h-4 w-4" /> : 'Confirm Reopen'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PermissionGuard>
    </div>
  )
}
