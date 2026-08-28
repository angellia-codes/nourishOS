import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import * as employeeService from '@/features/hr/services/employeeService'
import * as engagementService from '../engagementService'
import { ENGAGEMENT_STATUS_LABELS } from '../engagementFormat'
import type { Employee, EngagementStatus } from '@/types'

const STATUSES: EngagementStatus[] = ['planned', 'completed', 'cancelled']

/**
 * Create or edit an Employee Engagement record — one page, branching on
 * whether an engagementId is in the URL, same shape as every other HR form.
 *
 * Participants are Employee doc ids, sourced from the employee roster (not
 * the auth-uid identity directory Task/Calendar pickers use) — most floor
 * staff, the people actually attending a company event, have no `users`
 * account, so keying off uid would silently exclude them.
 */
export function EngagementFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { engagementId } = useParams<{ engagementId: string }>()
  const isEdit = Boolean(engagementId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [participantSearch, setParticipantSearch] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [cost, setCost] = useState('0')
  const [status, setStatus] = useState<EngagementStatus>('planned')
  const [participantEmployeeIds, setParticipantEmployeeIds] = useState<string[]>([])

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])

  useEffect(() => {
    if (!engagementId) return
    let cancelled = false
    engagementService
      .getEngagement(engagementId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That record no longer exists.')
          navigate('/hr/engagement')
          return
        }
        setName(row.name)
        setDescription(row.description ?? '')
        setEventDate(row.eventDate)
        setLocation(row.location ?? '')
        setCost(String(row.cost))
        setStatus(row.status)
        setParticipantEmployeeIds(row.participantEmployeeIds)
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that record.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [engagementId, navigate, toast])

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees])
  const filteredEmployees = useMemo(() => {
    const search = participantSearch.trim().toLowerCase()
    if (!search) return activeEmployees
    return activeEmployees.filter((e) => e.fullName.toLowerCase().includes(search))
  }, [activeEmployees, participantSearch])

  function toggleParticipant(employeeId: string) {
    setParticipantEmployeeIds((ids) =>
      ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId],
    )
  }

  const canSubmit = name.trim() !== '' && eventDate !== '' && Number(cost) >= 0 && !submitting

  async function handleSave() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || undefined,
        eventDate,
        location: location.trim() || undefined,
        cost: Number(cost),
        participantEmployeeIds,
      }

      if (engagementId) {
        await engagementService.updateEngagement({ ...input, engagementId, status })
        toast.success('Record updated.')
        navigate(`/hr/engagement/${engagementId}`)
      } else {
        const { engagementId: newId } = await engagementService.createEngagement(input)
        toast.success('Event recorded.')
        navigate(`/hr/engagement/${newId}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that record.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit event' : 'New event'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engName">Event / activity name *</Label>
            <Input id="engName" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engDate">Event date *</Label>
            <Input id="engDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engLocation">Location</Label>
            <Input id="engLocation" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engCost">Cost (IDR) *</Label>
            <Input id="engCost" type="number" min={0} step={1} value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="engStatus">Status</Label>
              <Select id="engStatus" value={status} onChange={(e) => setStatus(e.target.value as EngagementStatus)}>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {ENGAGEMENT_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="engDescription">Description</Label>
          <Textarea
            id="engDescription"
            rows={3}
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="engParticipantSearch">Participants ({participantEmployeeIds.length})</Label>
          <Input
            id="engParticipantSearch"
            placeholder="Search by name…"
            value={participantSearch}
            onChange={(e) => setParticipantSearch(e.target.value)}
          />
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {filteredEmployees.map((employee) => (
              <label key={employee.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={participantEmployeeIds.includes(employee.id)}
                  onChange={() => toggleParticipant(employee.id)}
                />
                <span className="truncate">{employee.fullName}</span>
              </label>
            ))}
            {filteredEmployees.length === 0 && (
              <p className="text-sm text-muted-foreground">Nobody matches that search.</p>
            )}
          </div>
        </div>
      </CardContent>

      <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Save event'}
        </Button>
      </div>
    </Card>
  )
}
