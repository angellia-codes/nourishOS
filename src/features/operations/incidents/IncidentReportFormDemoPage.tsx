import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { PRIORITY, type Priority } from '@/constants/statuses'
import { FINANCE_DEPARTMENTS, FINANCE_OUTLETS } from '@/features/finance/financeDemoData'
import { INCIDENT_ROUTING, type IncidentType, type MockIncidentPerson } from './incidentDemoData'
import { INCIDENT_SEVERITY_LABELS, INCIDENT_TYPE_LABELS } from './incidentFormat'

interface PersonRow extends MockIncidentPerson {
  id: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Incident Report form — incident-report.md §4 Sections A–D, with the §3
 * type-based routing previewed live. Mock only; submit shows a toast.
 */
export function IncidentReportFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [incidentType, setIncidentType] = useState<IncidentType>('customerComplaint')
  const [severity, setSeverity] = useState<Priority>(PRIORITY.MEDIUM)
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [location, setLocation] = useState('')
  const [outletId, setOutletId] = useState(FINANCE_OUTLETS[0].id)
  const [departmentId, setDepartmentId] = useState(FINANCE_DEPARTMENTS[0].id)
  const [people, setPeople] = useState<PersonRow[]>([])
  const [immediateAction, setImmediateAction] = useState('')
  const [emergencyServices, setEmergencyServices] = useState<'yes' | 'no'>('no')
  const [attachmentCount, setAttachmentCount] = useState(0)

  const isInjury = incidentType === 'workplaceInjury'
  const canSubmit =
    title.trim() !== '' &&
    description.trim() !== '' &&
    occurredAt !== '' &&
    location.trim() !== '' &&
    immediateAction.trim() !== ''

  function handleSubmit() {
    if (!canSubmit) return
    const gmNote = severity === 'critical' ? ' GM notified immediately.' : ''
    toast.success(`Incident routed to ${INCIDENT_ROUTING[incidentType]} (demo).${gmNote} Nothing was written to a backend.`)
    navigate('/demo/operations/incidents')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the list; nothing is persisted.
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
          <div>
            <h1 className="text-xl font-semibold text-foreground">Report Incident</h1>
            <p className="text-sm text-muted-foreground">
              Will be assigned to: <span className="font-medium text-foreground">{INCIDENT_ROUTING[incidentType]}</span>
              {severity === 'critical' && ' · Critical — GM notified immediately'}
            </p>
          </div>
        </div>

        {/* Section A — What Happened */}
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
                <Input
                  id="incOccurredAt"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="incOutlet">Outlet</Label>
                <Select id="incOutlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {FINANCE_OUTLETS.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="incDepartment">Department</Label>
                <Select id="incDepartment" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {FINANCE_DEPARTMENTS.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B — People Involved */}
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
                  onChange={(e) =>
                    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, name: e.target.value } : p)))
                  }
                />
                <Select
                  aria-label="Role"
                  value={person.role}
                  onChange={(e) =>
                    setPeople((prev) =>
                      prev.map((p) => (p.id === person.id ? { ...p, role: e.target.value as PersonRow['role'] } : p)),
                    )
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

        {/* Section C — Immediate Response */}
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
              <Label htmlFor="incEmergency">
                First Aid / Emergency Services Called?{isInjury && ' * (required for workplace injury)'}
              </Label>
              <Select
                id="incEmergency"
                value={emergencyServices}
                onChange={(e) => setEmergencyServices(e.target.value as 'yes' | 'no')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section D — Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAttachmentCount((count) => count + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setAttachmentCount((count) => count + 1)
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to add a demo attachment</span>
                {attachmentCount > 0 && ` — ${attachmentCount} added`}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/operations/incidents')}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Submit Incident Report
          </Button>
        </div>
      </div>
    </div>
  )
}
