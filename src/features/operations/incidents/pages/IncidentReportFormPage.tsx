import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { PRIORITY, type Priority } from '@/constants/statuses'
import { INCIDENT_ROUTING } from '../incidentDemoData'
import { INCIDENT_SEVERITY_LABELS, INCIDENT_TYPE_LABELS } from '../incidentFormat'
import * as incidentService from '../incidentService'
import type { IncidentPerson, IncidentType } from '@/types'

interface PersonRow extends IncidentPerson {
  id: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/** Incident Report form — incident-report.md §4 Sections A–C. Attachments (§4 Section D) are added afterward from the detail page, once a doc id exists to attach files against. */
export function IncidentReportFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [incidentType, setIncidentType] = useState<IncidentType>('customerComplaint')
  const [severity, setSeverity] = useState<Priority>(PRIORITY.MEDIUM)
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [location, setLocation] = useState('')
  const [people, setPeople] = useState<PersonRow[]>([])
  const [immediateAction, setImmediateAction] = useState('')
  const [emergencyServices, setEmergencyServices] = useState<'yes' | 'no'>('no')
  const [submitting, setSubmitting] = useState(false)

  const isInjury = incidentType === 'workplaceInjury'
  const canSubmit =
    title.trim() !== '' && description.trim() !== '' && occurredAt !== '' && location.trim() !== '' && immediateAction.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { incidentNumber, linkedWorkOrderId } = await incidentService.createIncidentReport({
        title,
        description,
        incidentType,
        severity,
        location,
        occurredAt,
        peopleInvolved: people.map(({ id: _id, ...person }) => person),
        immediateActionTaken: immediateAction,
        emergencyServicesCalled: emergencyServices === 'yes',
      })
      const workOrderNote = linkedWorkOrderId ? ' Linked work order created.' : ''
      toast.success(`${incidentNumber} reported and routed to ${INCIDENT_ROUTING[incidentType]}.${workOrderNote}`)
      navigate('/operations/incidents')
    } catch {
      toast.error('Failed to report incident. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/incidents')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Report Incident</h1>
          <p className="text-sm text-muted-foreground">
            Will be assigned to: <span className="font-medium text-foreground">{INCIDENT_ROUTING[incidentType]}</span>
            {severity === 'critical' && ' · Critical — GM notified immediately'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What Happened</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incTitle">Title *</Label>
            <Input id="incTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incType">Incident Type *</Label>
              <Select id="incType" value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType)}>
                {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incSeverity">Severity *</Label>
              <Select id="incSeverity" value={severity} onChange={(e) => setSeverity(e.target.value as Priority)}>
                {Object.entries(INCIDENT_SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incDescription">Description *</Label>
            <Textarea id="incDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incOccurredAt">Date/Time Occurred *</Label>
              <Input id="incOccurredAt" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incLocation">Location *</Label>
              <Input
                id="incLocation"
                placeholder='e.g. "Kitchen — walk-in chiller"'
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People Involved</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {people.map((person) => (
            <div key={person.id} className="flex gap-2">
              <Input
                placeholder="Name"
                value={person.name}
                onChange={(e) => setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, name: e.target.value } : p)))}
              />
              <Select
                aria-label="Role"
                value={person.role}
                onChange={(e) =>
                  setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, role: e.target.value as PersonRow['role'] } : p)))
                }
              >
                <option value="employee">Employee</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="other">Other</option>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPeople((prev) => prev.filter((p) => p.id !== person.id))}
                aria-label="Remove person"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setPeople((prev) => [...prev, { id: newId('person'), name: '', role: 'employee' }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Add Person
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Immediate Response</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incAction">Immediate Action Taken *</Label>
            <Textarea id="incAction" value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incEmergency">First Aid / Emergency Services Called?{isInjury && ' * (required for workplace injury)'}</Label>
            <Select id="incEmergency" value={emergencyServices} onChange={(e) => setEmergencyServices(e.target.value as 'yes' | 'no')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/operations/incidents')} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : 'Submit Incident Report'}
        </Button>
      </div>
    </div>
  )
}
