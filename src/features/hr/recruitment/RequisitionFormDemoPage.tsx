import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { MOCK_EMPLOYEES } from '@/features/hr/pages/employeeDemoData'
import {
  POSITION_LABELS,
  REQUISITION_DEPARTMENTS,
  REQUISITION_OUTLETS,
  computeApprovalChain,
  type EmploymentType,
  type PositionId,
  type RequisitionType,
  type Urgency,
} from './employeeRequisitionDemoData'
import { EMPLOYMENT_TYPE_LABELS, REQUISITION_TYPE_LABELS, URGENCY_LABELS } from './employeeRequisitionFormat'

interface Attachment {
  id: string
  fileName: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Read-only-except-for-the-form visual preview of the Requisition submission
 * form — employee-requisition.md §3 Sections A–D. Mock data, no Firestore/
 * Cloud Function calls. The approval chain preview reproduces §5's
 * budgeted/requisition-type branching client-side so the requester can see
 * who will be asked to approve before submitting.
 */
export function RequisitionFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [outletId, setOutletId] = useState(REQUISITION_OUTLETS[0].id)
  const [departmentId, setDepartmentId] = useState(REQUISITION_DEPARTMENTS[0].id)
  const [positionId, setPositionId] = useState<PositionId | 'other'>('waiter')
  const [positionTitleFallback, setPositionTitleFallback] = useState('')
  const [openings, setOpenings] = useState('1')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('ft')
  const [contractMonths, setContractMonths] = useState('')
  const [requisitionType, setRequisitionType] = useState<RequisitionType>('new_position')
  const [replacingEmployeeId, setReplacingEmployeeId] = useState('')
  const [targetJoinDate, setTargetJoinDate] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('normal')

  const [justification, setJustification] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [requirements, setRequirements] = useState('')
  const [workSchedule, setWorkSchedule] = useState('')

  const [budgeted, setBudgeted] = useState(true)
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')

  const [attachments, setAttachments] = useState<Attachment[]>([])

  const approvalChain = useMemo(() => computeApprovalChain(budgeted, false), [budgeted])

  const isValid =
    openings !== '' &&
    Number(openings) >= 1 &&
    (positionId !== 'other' || positionTitleFallback.trim().length > 0) &&
    (requisitionType !== 'replacement' || replacingEmployeeId !== '') &&
    (employmentType !== 'fixed_term' || contractMonths !== '') &&
    targetJoinDate !== '' &&
    justification.trim().length > 0 &&
    responsibilities.trim().length > 0 &&
    requirements.trim().length > 0 &&
    workSchedule.trim().length > 0 &&
    salaryMin !== '' &&
    salaryMax !== ''

  function handleSubmit() {
    if (!isValid) return
    toast.success('Requisition submitted (demo) — requisition number is generated server-side in the real flow; nothing was written to a backend.')
    navigate('/demo/hr/requisitions')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the list; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/requisitions')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New Requisition</h1>
            <p className="text-sm text-muted-foreground">Draft → Submitted → Pending Approval → Approved / Rejected</p>
          </div>
        </div>

        {/* Section A — Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="outlet">Outlet *</Label>
                <Select id="outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {REQUISITION_OUTLETS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">Department *</Label>
                <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {REQUISITION_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position">Position *</Label>
                <Select id="position" value={positionId} onChange={(e) => setPositionId(e.target.value as PositionId | 'other')}>
                  {Object.entries(POSITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                  <option value="other">Other (specify — flagged for HR review)</option>
                </Select>
              </div>
              {positionId === 'other' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="positionFallback">Position Title *</Label>
                  <Input
                    id="positionFallback"
                    value={positionTitleFallback}
                    onChange={(e) => setPositionTitleFallback(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openings">Number of Openings *</Label>
                <Input id="openings" type="number" min={1} value={openings} onChange={(e) => setOpenings(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select id="employmentType" value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              {employmentType === 'fixed_term' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contractMonths">Contract Duration (months) *</Label>
                  <Input
                    id="contractMonths"
                    type="number"
                    min={1}
                    value={contractMonths}
                    onChange={(e) => setContractMonths(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="requisitionType">Requisition Type *</Label>
                <Select
                  id="requisitionType"
                  value={requisitionType}
                  onChange={(e) => setRequisitionType(e.target.value as RequisitionType)}
                >
                  {Object.entries(REQUISITION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              {requisitionType === 'replacement' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="replacingEmployee">Replacing Employee *</Label>
                  <Select id="replacingEmployee" value={replacingEmployeeId} onChange={(e) => setReplacingEmployeeId(e.target.value)}>
                    <option value="">Select employee</option>
                    {MOCK_EMPLOYEES.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="targetJoinDate">Target Join Date *</Label>
                <Input id="targetJoinDate" type="date" value={targetJoinDate} onChange={(e) => setTargetJoinDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="urgency">Urgency *</Label>
                <Select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
                  {Object.entries(URGENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B — Justification */}
        <Card>
          <CardHeader>
            <CardTitle>Justification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="justification">Business Justification *</Label>
              <Textarea id="justification" value={justification} onChange={(e) => setJustification(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="responsibilities">Key Responsibilities *</Label>
              <Textarea id="responsibilities" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements">Requirements (skills, experience, certs) *</Label>
              <Textarea id="requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workSchedule">Work Schedule / Shift Pattern *</Label>
              <Input id="workSchedule" value={workSchedule} onChange={(e) => setWorkSchedule(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Section C — Compensation (restricted visibility) */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Visible to HR Manager, GM, Director, and Super Admin only once submitted (employee-requisition.md §3 Section C).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="salaryMin">Salary Min (IDR) *</Label>
                <Input id="salaryMin" type="number" min={0} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="salaryMax">Salary Max (IDR) *</Label>
                <Input id="salaryMax" type="number" min={0} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budgeted">Budgeted? *</Label>
              <Select id="budgeted" value={budgeted ? 'yes' : 'no'} onChange={(e) => setBudgeted(e.target.value === 'yes')}>
                <option value="yes">Yes — within approved headcount budget</option>
                <option value="no">No — requires Director approval</option>
              </Select>
            </div>

            {/* Approval chain preview — employee-requisition.md §5 */}
            <div className="rounded-md border border-border bg-background p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Approval chain for this request</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {approvalChain.map((role, i) => (
                  <span key={role} className="flex items-center gap-1.5">
                    <Badge variant="neutral">{role}</Badge>
                    {i < approvalChain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section D — Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAttachments((prev) => [...prev, { id: newId('att'), fileName: `Document ${prev.length + 1}.pdf` }])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setAttachments((prev) => [...prev, { id: newId('att'), fileName: `Document ${prev.length + 1}.pdf` }])
                }
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to add a demo attachment</span>
              </p>
              <p className="text-xs text-muted-foreground">Org chart excerpt, workload evidence, event brief</p>
            </div>
            {attachments.length > 0 && (
              <ul className="flex flex-col gap-2">
                {attachments.map((att) => (
                  <li key={att.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                    <span className="flex-1 truncate text-foreground">{att.fileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      aria-label={`Remove ${att.fileName}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/hr/requisitions')}>
            Cancel
          </Button>
          <Button type="button" disabled={!isValid} onClick={handleSubmit}>
            Submit Requisition
          </Button>
        </div>
      </div>
    </div>
  )
}
