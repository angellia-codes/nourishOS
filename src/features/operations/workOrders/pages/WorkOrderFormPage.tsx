import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import * as workOrderService from '../workOrderService'
import { WORK_ORDER_PRIORITY_LABELS } from '../workOrderFormat'
import type { Priority } from '@/constants/statuses'

const LIST_ROUTE = '/operations/work-orders'

/** Manual creation — incident-triggered work orders are created server-side by createWorkOrderInternal instead. */
export function WorkOrderFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim() !== '' && description.trim() !== '' && location.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await workOrderService.createWorkOrder({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority,
      })
      toast.success('Work order created.')
      navigate(LIST_ROUTE)
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
