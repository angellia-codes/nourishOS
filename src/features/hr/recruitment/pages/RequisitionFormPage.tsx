import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, OUTLETS, OUTLET_DEPARTMENTS, PERMISSIONS } from '@/constants'
import { POSITION_LABELS, positionsFor, type PositionId } from '@/constants/positions'
import { useAuth, usePermissions, useToast } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import { EMPLOYMENT_TYPE_LABELS, REQUISITION_TYPE_LABELS } from '../recruitmentFormat'
import type { Employee } from '@/types'

const LIST_ROUTE = '/hr/requisitions'
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department.name]),
)

/**
 * Raise or edit a manpower request — employee-requisition.md §3 sections A and
 * B. Section C (salary range) is not captured in this pass; §3's note that
 * compensation lives in a restricted subdocument is the reason it isn't simply
 * added to this form.
 *
 * Editable only while the requisition is a draft: once submitted, approvers are
 * evaluating a snapshot, and the server refuses the write anyway.
 */
export function RequisitionFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { requisitionId } = useParams<{ requisitionId: string }>()
  const isEdit = Boolean(requisitionId)

  const [outletId, setOutletId] = useState(profile?.outletId ?? '')
  const [departmentId, setDepartmentId] = useState('')
  const [position, setPosition] = useState('')
  const [openings, setOpenings] = useState('1')
  const [employmentType, setEmploymentType] = useState('ft')
  const [contractMonths, setContractMonths] = useState('')
  const [requisitionType, setRequisitionType] = useState('new_position')
  const [replacingEmployeeId, setReplacingEmployeeId] = useState('')
  const [targetJoinDate, setTargetJoinDate] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [justification, setJustification] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [requirements, setRequirements] = useState('')
  const [workSchedule, setWorkSchedule] = useState('')
  const [budgeted, setBudgeted] = useState(true)

  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([])

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!requisitionId) return
    let cancelled = false

    recruitmentService
      .getRequisition(requisitionId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setLoadError('That requisition no longer exists.')
        } else if (row.status !== 'draft') {
          setLoadError('Only a draft requisition can be edited.')
        } else {
          setOutletId(row.outletId)
          setDepartmentId(row.departmentId)
          setPosition(row.position)
          setOpenings(String(row.openings))
          setEmploymentType(row.employmentType)
          setContractMonths(row.contractMonths ? String(row.contractMonths) : '')
          setRequisitionType(row.requisitionType)
          setReplacingEmployeeId(row.replacingEmployeeId ?? '')
          setTargetJoinDate(row.targetJoinDate)
          setUrgency(row.urgency)
          setJustification(row.justification)
          setResponsibilities(row.responsibilities)
          setRequirements(row.requirements)
          setWorkSchedule(row.workSchedule)
          setBudgeted(row.budgeted)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load that requisition.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requisitionId])

  useEffect(() => {
    if (requisitionType !== 'replacement' || departmentId === '') {
      setActiveEmployees([])
      return
    }
    let cancelled = false
    recruitmentService.listActiveEmployeesInDepartment(departmentId).then((rows) => {
      if (!cancelled) setActiveEmployees(rows)
    })
    return () => {
      cancelled = true
    }
  }, [requisitionType, departmentId])

  const departmentOptions = OUTLET_DEPARTMENTS[outletId] ?? []

  // Same legacy-value-fallback pattern EmployeeFormPage's Position select
  // already established: an existing value outside the current catalog (e.g.
  // after a department change) stays selectable rather than silently blanking.
  const positionOptions: { id: string; name: string }[] = useMemo(() => {
    const ids = positionsFor(outletId, departmentId)
    const base = ids.map((id) => ({ id, name: POSITION_LABELS[id] ?? id }))
    if (position && !ids.includes(position as PositionId)) {
      return [...base, { id: position, name: `${position} (legacy)` }]
    }
    return base
  }, [outletId, departmentId, position])
  const canSubmit =
    outletId !== '' &&
    departmentId !== '' &&
    position.trim() !== '' &&
    Number(openings) >= 1 &&
    targetJoinDate !== '' &&
    justification.trim() !== '' &&
    responsibilities.trim() !== '' &&
    requirements.trim() !== '' &&
    workSchedule.trim() !== '' &&
    (employmentType !== 'fixed_term' || Number(contractMonths) >= 1) &&
    (requisitionType !== 'replacement' || replacingEmployeeId.trim() !== '')

  async function handleSave() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const input = {
        outletId,
        departmentId,
        position: position.trim(),
        openings: Number(openings),
        employmentType,
        contractMonths: employmentType === 'fixed_term' ? Number(contractMonths) : null,
        requisitionType,
        replacingEmployeeId: requisitionType === 'replacement' ? replacingEmployeeId.trim() : null,
        targetJoinDate,
        urgency,
        justification: justification.trim(),
        responsibilities: responsibilities.trim(),
        requirements: requirements.trim(),
        workSchedule: workSchedule.trim(),
        budgeted,
      }

      if (requisitionId) {
        await recruitmentService.updateRequisition({ ...input, requisitionId })
        toast.success('Requisition updated.')
        navigate(`/hr/requisitions/${requisitionId}`)
      } else {
        const { requisitionId: newId } = await recruitmentService.createRequisition(input)
        toast.success('Draft saved. Submit it when you are ready for approval.')
        navigate(`/hr/requisitions/${newId}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!can(PERMISSIONS.RECRUITMENT_CREATE)) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="No access"
          description="Your role can't raise manpower requests."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to requisitions
            </Button>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not editable"
          description={loadError}
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to requisitions
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit requisition' : 'New requisition'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saved as a draft first. Submitting sends it to HR, then the GM — the vacancy only opens once both approve.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqOutlet">Outlet *</Label>
            <Select
              id="reqOutlet"
              value={outletId}
              onChange={(e) => {
                setOutletId(e.target.value)
                setDepartmentId('')
                setPosition('')
              }}
            >
              <option value="">Select an outlet…</option>
              {OUTLETS.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqDepartment">Department *</Label>
            <Select
              id="reqDepartment"
              value={departmentId}
              disabled={outletId === ''}
              onChange={(e) => {
                setDepartmentId(e.target.value)
                setPosition('')
              }}
            >
              <option value="">{outletId === '' ? 'Select an outlet first' : 'Select a department…'}</option>
              {departmentOptions.map((id) => (
                <option key={id} value={id}>
                  {DEPARTMENT_NAMES[id] ?? id}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqPosition">Position *</Label>
            <Select
              id="reqPosition"
              value={position}
              disabled={departmentId === ''}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">{departmentId === '' ? 'Select a department first' : 'Select a position…'}</option>
              {positionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqOpenings">Number of openings *</Label>
            <Input
              id="reqOpenings"
              type="number"
              min={1}
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqEmploymentType">Employment type *</Label>
            <Select
              id="reqEmploymentType"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
            >
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {employmentType === 'fixed_term' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqContractMonths">Contract duration (months) *</Label>
              <Input
                id="reqContractMonths"
                type="number"
                min={1}
                max={60}
                value={contractMonths}
                onChange={(e) => setContractMonths(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqType">Requisition type *</Label>
            <Select id="reqType" value={requisitionType} onChange={(e) => setRequisitionType(e.target.value)}>
              {Object.entries(REQUISITION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {requisitionType === 'replacement' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqReplacing">Replacing *</Label>
              <Select
                id="reqReplacing"
                value={replacingEmployeeId}
                disabled={departmentId === ''}
                onChange={(e) => setReplacingEmployeeId(e.target.value)}
              >
                <option value="">
                  {departmentId === '' ? 'Select a department first' : 'Select the employee being replaced…'}
                </option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeNumber})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqTargetJoin">Target join date *</Label>
            <Input
              id="reqTargetJoin"
              type="date"
              value={targetJoinDate}
              onChange={(e) => setTargetJoinDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reqUrgency">Urgency *</Label>
            <Select id="reqUrgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reqJustification">Business justification *</Label>
          <Textarea
            id="reqJustification"
            rows={3}
            maxLength={2000}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reqResponsibilities">Key responsibilities *</Label>
          <Textarea
            id="reqResponsibilities"
            rows={3}
            maxLength={2000}
            value={responsibilities}
            onChange={(e) => setResponsibilities(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reqRequirements">Requirements *</Label>
          <Textarea
            id="reqRequirements"
            rows={3}
            maxLength={2000}
            placeholder="Skills, experience, certifications (e.g. food safety)."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reqSchedule">Work schedule / shift pattern *</Label>
          <Input
            id="reqSchedule"
            value={workSchedule}
            maxLength={500}
            placeholder="e.g. 6 days, split shift"
            onChange={(e) => setWorkSchedule(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Checkbox id="reqBudgeted" checked={budgeted} onChange={(e) => setBudgeted(e.target.checked)} />
          <Label htmlFor="reqBudgeted">This headcount is already budgeted</Label>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit} loading={submitting}>
            {isEdit ? 'Save changes' : 'Save draft'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
