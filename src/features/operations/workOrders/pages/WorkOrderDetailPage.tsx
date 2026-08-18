import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner, StatusPill, Textarea } from '@/components/ui'
import { EmptyState, FileList, FileUpload } from '@/components/shared'
import { useFirestoreDoc, useFirestoreQuery, usePermissions, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import { subscribeToDirectory, type DirectoryUser } from '@/services/shared/userService'
import { formatDateTime } from '@/utils/date'
import * as workOrderService from '../workOrderService'
import {
  WORK_ORDER_PHOTO_AFTER,
  WORK_ORDER_PHOTO_BEFORE,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_VARIANT,
  WORK_ORDER_STATUS_ICON,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TONE,
} from '../workOrderFormat'
import type { FileMetadata, WorkOrder, WorkOrderStatus } from '@/types'

const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  open: 'assigned',
  assigned: 'inProgress',
  inProgress: 'completed',
  completed: 'closed',
}

const PERMISSION_FOR_STATUS: Partial<Record<WorkOrderStatus, string>> = {
  assigned: PERMISSIONS.WORK_ORDERS_ASSIGN,
  inProgress: PERMISSIONS.WORK_ORDERS_UPDATE,
  completed: PERMISSIONS.WORK_ORDERS_COMPLETE,
  closed: PERMISSIONS.WORK_ORDERS_UPDATE,
}

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()

  const { data: workOrder, loading } = useFirestoreDoc<WorkOrder>(COLLECTIONS.WORK_ORDERS, workOrderId)
  const { data: beforePhotos } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    workOrderId
      ? [
          where('resourceType', '==', WORK_ORDER_PHOTO_BEFORE),
          where('resourceId', '==', workOrderId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [workOrderId],
  )
  const { data: afterPhotos } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    workOrderId
      ? [
          where('resourceType', '==', WORK_ORDER_PHOTO_AFTER),
          where('resourceId', '==', workOrderId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [workOrderId],
  )
  const [directory, setDirectory] = useState<DirectoryUser[]>([])
  const [assignee, setAssignee] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    return subscribeToDirectory(setDirectory)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!workOrder) {
    return (
      <EmptyState
        title="Work order not found"
        action={
          <Button type="button" variant="secondary" onClick={() => navigate('/operations/work-orders')}>
            Back to work orders
          </Button>
        }
      />
    )
  }

  const nextStatus = NEXT_STATUS[workOrder.status]
  const requiredPermission = nextStatus ? PERMISSION_FOR_STATUS[nextStatus] : undefined
  const canAdvance = requiredPermission ? can(requiredPermission) : false
  const requiresAssignee = nextStatus === 'assigned'
  const requiresProgressNote = nextStatus === 'inProgress'
  const requiresResolutionNotes = nextStatus === 'completed'
  // updateWorkOrderStatus rejects a completion with no after photo; mirror
  // that here so the button explains itself instead of failing on submit.
  const missingAfterPhoto = requiresResolutionNotes && afterPhotos.length === 0

  async function handleAdvance() {
    if (!nextStatus || !workOrder) return
    if (requiresProgressNote && !progressNote.trim()) return
    if (requiresResolutionNotes && (!resolutionNotes.trim() || missingAfterPhoto)) return
    setAdvancing(true)
    try {
      await workOrderService.updateWorkOrderStatus({
        workOrderId: workOrder.id,
        status: nextStatus,
        assignedTo: requiresAssignee && assignee ? assignee : undefined,
        notes: requiresProgressNote ? progressNote : undefined,
        resolutionNotes: requiresResolutionNotes ? resolutionNotes : undefined,
      })
      setProgressNote('')
      toast.success(`Status moved to ${WORK_ORDER_STATUS_LABELS[nextStatus]}.`)
    } catch {
      toast.error('Failed to update status. Please try again.')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/work-orders')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{workOrder.title}</h1>
          <p className="text-sm text-muted-foreground">{workOrder.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={WORK_ORDER_PRIORITY_VARIANT[workOrder.priority]}>
            {WORK_ORDER_PRIORITY_LABELS[workOrder.priority]}
          </Badge>
          <StatusPill
            tone={WORK_ORDER_STATUS_TONE[workOrder.status]}
            icon={WORK_ORDER_STATUS_ICON[workOrder.status]}
            label={WORK_ORDER_STATUS_LABELS[workOrder.status]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground">{workOrder.description}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos — Before</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FileList files={beforePhotos} />
          <FileUpload
            module="operations"
            resourceType={WORK_ORDER_PHOTO_BEFORE}
            resourceId={workOrder.id}
            accept="image/*"
            camera
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos — After</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Required before a work order can be completed.</p>
          <FileList files={afterPhotos} />
          <FileUpload
            module="operations"
            resourceType={WORK_ORDER_PHOTO_AFTER}
            resourceId={workOrder.id}
            accept="image/*"
            camera
          />
        </CardContent>
      </Card>

      {workOrder.progressNotes?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {workOrder.progressNotes.map((entry) => (
              <div key={`${entry.at}-${entry.by}`} className="rounded-md border border-border p-2">
                <p className="text-sm text-foreground">{entry.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {workOrder.resolutionNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground">{workOrder.resolutionNotes}</CardContent>
        </Card>
      )}

      {nextStatus && canAdvance && (
        <Card>
          <CardHeader>
            <CardTitle>Move to {WORK_ORDER_STATUS_LABELS[nextStatus]}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {requiresAssignee && (
              <Select aria-label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Accept it myself</option>
                {directory.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName}
                  </option>
                ))}
              </Select>
            )}
            {requiresProgressNote && (
              <Textarea
                placeholder="What is the status? (required while the job is open) *"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
              />
            )}
            {missingAfterPhoto && (
              <p className="text-sm text-destructive">Upload an after photo above before completing this work order.</p>
            )}
            {requiresResolutionNotes && (
              <Textarea
                placeholder="Resolution notes (required to complete) *"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={
                  advancing ||
                  (requiresProgressNote && !progressNote.trim()) ||
                  (requiresResolutionNotes && (!resolutionNotes.trim() || missingAfterPhoto))
                }
                onClick={handleAdvance}
              >
                {advancing ? <Spinner className="h-4 w-4" /> : `Move to ${WORK_ORDER_STATUS_LABELS[nextStatus]}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
