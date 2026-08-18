import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { Button, Card, CardContent, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
import { DEPARTMENTS, OUTLETS, OUTLET_DEPARTMENTS } from '@/constants/organization'
import { fileService } from '@/services/shared'
import * as workOrderService from '../workOrderService'
import { WORK_ORDER_PRIORITY_LABELS, WORK_ORDER_PHOTO_BEFORE } from '../workOrderFormat'
import type { Priority } from '@/constants/statuses'

const LIST_ROUTE = '/operations/work-orders'

/** Manual creation — incident-triggered work orders are created server-side by createWorkOrderInternal instead. */
export function WorkOrderFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [outletId, setOutletId] = useState(profile?.outletId ?? '')
  const [departmentId, setDepartmentId] = useState(profile?.departmentId ?? '')
  const [photos, setPhotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Departments narrow to the chosen outlet — OUTLETS_DEPARTMENTS.md §2, and
  // the same pairing createWorkOrder re-checks server-side.
  const departmentOptions = useMemo(() => {
    const allowed = OUTLET_DEPARTMENTS[outletId] ?? []
    return DEPARTMENTS.filter((d) => allowed.includes(d.id))
  }, [outletId])

  const canSubmit =
    title.trim() !== '' && description.trim() !== '' && location.trim() !== '' && outletId !== '' && departmentId !== ''

  function handleOutletChange(nextOutletId: string) {
    setOutletId(nextOutletId)
    if (!OUTLET_DEPARTMENTS[nextOutletId]?.includes(departmentId)) {
      setDepartmentId('')
    }
  }

  function addPhotos(fileList: FileList | null) {
    if (fileList) setPhotos((prev) => [...prev, ...Array.from(fileList)])
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { workOrderId } = await workOrderService.createWorkOrder({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority,
        outletId,
        departmentId,
      })

      // Photos upload after the create resolves — a file needs the resourceId
      // to attach to, the same "create then attach" order Security Patrol and
      // Lost & Found use.
      for (const file of photos) {
        try {
          await fileService.uploadFile({
            file,
            module: 'operations',
            resourceType: WORK_ORDER_PHOTO_BEFORE,
            resourceId: workOrderId,
          })
        } catch {
          toast.error(`Work order created, but ${file.name} failed to upload.`)
        }
      }

      toast.success('Work order created.')
      navigate(`${LIST_ROUTE}/${workOrderId}`)
    } catch {
      toast.error('Failed to create work order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">New Work Order</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-title">Title *</Label>
            <Input id="wo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-description">Description *</Label>
            <Textarea id="wo-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-outlet">Outlet *</Label>
            <Select id="wo-outlet" value={outletId} onChange={(e) => handleOutletChange(e.target.value)}>
              <option value="">Select an outlet…</option>
              {OUTLETS.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-department">Department *</Label>
            <Select
              id="wo-department"
              value={departmentId}
              disabled={!outletId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">{outletId ? 'Select a department…' : 'Pick an outlet first'}</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-location">Location *</Label>
            <Input id="wo-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wo-priority">Priority</Label>
            <Select id="wo-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(WORK_ORDER_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Photos</Label>
            <p className="text-xs text-muted-foreground">
              Condition on arrival. Uploaded once the work order is created.
            </p>
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary/50">
                Choose files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
              {/* `capture` opens the camera on mobile; desktop ignores it and shows the picker. */}
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary/50">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Take a photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            </div>
            {photos.length > 0 && (
              <ul className="flex flex-col gap-1">
                {photos.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
