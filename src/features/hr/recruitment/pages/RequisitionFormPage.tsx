import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { POSITION_LABELS } from '@/constants/positions'
import type { PositionId } from '@/constants/positions'
import type { EmploymentType, RequisitionType, Urgency } from '@/types'
import * as requisitionService from '../requisitionService'
import { EMPLOYMENT_TYPE_LABELS, REQUISITION_TYPE_LABELS, URGENCY_LABELS } from '../requisitionFormat'

// employee-requisition.md §5 — client preview of who will approve (server owns
// the real route). Mirrors routes.ts: base chain + Director when unbudgeted.
function approvalChainPreview(budgeted: boolean): string[] {
  const base = ['Outlet Manager', 'HR Manager', 'General Manager']
  return budgeted ? base : [...base, 'Director']
}

/**
 * New Requisition — employee-requisition.md §3 Sections A–B. Outlet/department
 * are auto-filled server-side from the requester's profile (not on the form).
 * One-shot: create draft → submit for approval. Compensation (Section C) and
 * attachments (Section D) are deferred for v1; only the `budgeted` routing flag
 * is captured.
 */
export function RequisitionFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

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

  const [submitting, setSubmitting] = useState(false)

  const chain = useMemo(() => approvalChainPreview(budgeted), [budgeted])

  const isValid =
    openings !== '' &&
    Number(openings) >= 1 &&
    (positionId !== 'other' || positionTitleFallback.trim().length > 0) &&
    (requisitionType !== 'replacement' || replacingEmployeeId.trim() !== '') &&
    (employmentType !== 'fixed_term' || Number(contractMonths) >= 1) &&
    targetJoinDate !== '' &&
    justification.trim().length > 0 &&
    responsibilities.trim().length > 0 &&
    requirements.trim().length > 0 &&
    workSchedule.trim().length > 0

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    try {
      const { requisitionId } = await requisitionService.createRequisition({
        positionId: positionId === 'other' ? null : positionId,
        positionTitleFallback: positionId === 'other' ? positionTitleFallback.trim() : undefined,
        openings: Number(openings),
        employmentType,
        contractMonths: employmentType === 'fixed_term' ? Number(contractMonths) : undefined,
        requisitionType,
        replacingEmployeeId: requisitionType === 'replacement' ? replacingEmployeeId.trim() : undefined,
        targetJoinDate,
        urgency,
        justification,
        responsibilities,
        requirements,
        workSchedule,
        budgeted,
      })

      const { requisitionNumber } = await requisitionService.submitRequisition(requisitionId)

      toast.success(`${requisitionNumber} submitted for approval.`)
      navigate('/hr/recruitment')
    } catch {
      toast.error('Failed to submit requisition. A draft may have been saved — check the list.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/recruitment')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Requisition</h1>
          <p className="text-sm text-muted-foreground">Draft → Pending Approval → Approved / Rejected</p>
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
                <Input id="positionFallback" value={positionTitleFallback} onChange={(e) => setPositionTitleFallback(e.target.value)} />
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
                <Input id="contractMonths" type="number" min={1} value={contractMonths} onChange={(e) => setContractMonths(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requisitionType">Requisition Type *</Label>
              <Select id="requisitionType" value={requisitionType} onChange={(e) => setRequisitionType(e.target.value as RequisitionType)}>
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
                <Input
                  id="replacingEmployee"
                  placeholder="Employee name or ID"
                  value={replacingEmployeeId}
                  onChange={(e) => setReplacingEmployeeId(e.target.value)}
                />
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budgeted">Budgeted? *</Label>
            <Select id="budgeted" value={budgeted ? 'yes' : 'no'} onChange={(e) => setBudgeted(e.target.value === 'yes')}>
              <option value="yes">Yes — within approved headcount budget</option>
              <option value="no">No — requires Director approval</option>
            </Select>
          </div>

          {/* Approval chain preview — §5 */}
          <div className="rounded-md border border-border bg-background p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Approval chain for this request</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {chain.map((role, i) => (
                <span key={role} className="flex items-center gap-1.5">
                  <Badge variant="neutral">{role}</Badge>
                  {i < chain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/recruitment')} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : 'Submit Requisition'}
        </Button>
      </div>
    </div>
  )
}
