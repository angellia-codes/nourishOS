import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { useFirestoreDoc, useToast } from '@/hooks'
import * as employeeService from '@/features/hr/services/employeeService'
import * as engagementService from '../engagementService'
import { ENGAGEMENT_STATUS_ICON, ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_TONE, formatIdr } from '../engagementFormat'
import type { EmployeeEngagement, Employee } from '@/types'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export function EngagementDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { engagementId } = useParams<{ engagementId: string }>()

  const { data: engagement, loading, error } = useFirestoreDoc<EmployeeEngagement>(
    COLLECTIONS.EMPLOYEE_ENGAGEMENTS,
    engagementId,
  )
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])

  async function handleArchive() {
    if (!engagementId) return
    if (!window.confirm('Archive this event? It will no longer appear on the list.')) return
    try {
      await engagementService.updateEngagement({ engagementId, isArchived: true })
      toast.success('Event archived.')
      navigate('/hr/engagement')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive that event.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !engagement || !engagementId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Record unavailable"
          description="That event may have been removed, or your account can't read this register."
        />
      </div>
    )
  }

  const participants = employees.filter((e) => engagement.participantEmployeeIds.includes(e.id))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/hr/engagement')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Employee Engagement
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={ENGAGEMENT_STATUS_TONE[engagement.status]}
              icon={ENGAGEMENT_STATUS_ICON[engagement.status]}
              label={ENGAGEMENT_STATUS_LABELS[engagement.status]}
            />
            {engagement.isArchived && <Badge variant="warning">Archived</Badge>}
          </div>
          <CardTitle>{engagement.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event date" value={engagement.eventDate} />
            <Field label="Location" value={engagement.location ?? '—'} />
            <Field label="Cost" value={formatIdr(engagement.cost)} />
            <Field label="Participants" value={String(engagement.participantEmployeeIds.length)} />
          </div>
          {engagement.description && <Field label="Description" value={engagement.description} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participants recorded.</p>
          ) : (
            participants.map((employee) => (
              <p key={employee.id} className="text-sm text-foreground">
                {employee.fullName}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <PermissionGuard permission={PERMISSIONS.EMPLOYEE_ENGAGEMENT_MANAGE}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={handleArchive} disabled={engagement.isArchived}>
            Archive
          </Button>
          <Button onClick={() => navigate(`/hr/engagement/${engagementId}/edit`)}>
            <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </PermissionGuard>
    </div>
  )
}
