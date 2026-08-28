import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
import { CROSS_OUTLET_ROLES, DEPARTMENTS, OUTLETS, POSITION_LABELS, ROLES } from '@/constants'
import { DISCIPLINARY_TYPE_LABELS, DISCIPLINARY_TYPE_RANK, type DisciplinaryType } from '@/constants/hr'
import * as employeeService from '@/features/hr/services/employeeService'
import { listActiveEmployeesInDepartment } from '@/features/recruitment/recruitmentService'
import * as service from '../employeeCommunicationService'
import {
  BILINGUAL,
  PROPOSED_ACTION_CATEGORY_LABELS,
  COMMUNICATION_STATUS_LABELS,
  validityDaysFor,
} from '../employeeCommunicationFormat'
import { formatDate } from '@/utils'
import type { DisciplinaryRecord, Employee, ProposedActionCategory } from '@/types'

/** An incident cannot be dated in the future. */
const TODAY = new Date().toISOString().slice(0, 10)

const labelIn = (source: readonly { id: string; name: string }[], id: string | null | undefined) =>
  (id ? source.find((entry) => entry.id === id)?.name : null) ?? id ?? '—'

/** Two-line section heading — §33, the form itself is bilingual. */
function SectionTitle({ section }: { section: keyof typeof BILINGUAL }) {
  return (
    <CardTitle className="flex flex-col gap-0.5">
      <span>{BILINGUAL[section].en}</span>
      <span className="text-xs font-normal italic text-muted-foreground">{BILINGUAL[section].id}</span>
    </CardTitle>
  )
}

/**
 * employee_communication.md §36 — create and edit-draft, one page, distinguished
 * by whether a recordId is in the URL.
 *
 * §35 Rule 1: employee facts are never retyped. Picking the employee fills
 * department/outlet/position as read-only text and the server re-copies them
 * from the register anyway, so what is shown here is a preview.
 *
 * §35 Rule 6 shows the employee's prior records as context. §35 Rule 4 is why
 * that stays a list and not a recommendation: the system may show history, but
 * the next disciplinary step is HR's decision, not a computed one. The
 * "next expected action" field is HR's own note of what a repeat would mean.
 */
export function CommunicationRecordFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { recordId } = useParams<{ recordId: string }>()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const isEdit = Boolean(recordId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [priorRecords, setPriorRecords] = useState<DisciplinaryRecord[]>([])

  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') ?? '')
  const [type, setType] = useState<DisciplinaryType>('coaching')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState(TODAY)
  const [incidentTime, setIncidentTime] = useState('')
  const [incidentLocation, setIncidentLocation] = useState('')
  const [incidentDetails, setIncidentDetails] = useState('')
  const [policyReference, setPolicyReference] = useState('')
  const [codeOfConductReference, setCodeOfConductReference] = useState('')
  const [actionCategory, setActionCategory] = useState<ProposedActionCategory | ''>('')
  const [actionTargetDate, setActionTargetDate] = useState('')
  const [nextExpectedAction, setNextExpectedAction] = useState<DisciplinaryType | ''>('')
  const [linkedPreviousRecordId, setLinkedPreviousRecordId] = useState('')
  /** Kept as a string so the field can be emptied while typing; '' means no expiry. */
  const [validityDays, setValidityDays] = useState('')

  const seesEveryEmployee = profile
    ? profile.roleId === ROLES.HR_MANAGER || (CROSS_OUTLET_ROLES as readonly string[]).includes(profile.roleId)
    : false

  // firestore.rules only lets a department leader read employees in their own
  // department, so the roster query has to match: everyone for HR and above, a
  // department-scoped one-shot otherwise. Same split RequisitionFormPage uses.
  useEffect(() => {
    if (seesEveryEmployee) {
      return employeeService.subscribeToEmployees(setEmployees)
    }
    if (!profile?.departmentId) return
    let cancelled = false
    void listActiveEmployeesInDepartment(profile.departmentId)
      .then((rows) => {
        if (!cancelled) setEmployees(rows)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [seesEveryEmployee, profile?.departmentId])

  useEffect(() => {
    if (!recordId) return
    let cancelled = false

    void service
      .getCommunicationRecord(recordId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That record no longer exists.')
          navigate('/communications/employee')
          return
        }
        if (row.status !== 'draft') {
          toast.error(`Only a draft can be edited — this one is ${COMMUNICATION_STATUS_LABELS[row.status]}.`)
          navigate(`/communications/employee/${recordId}`)
          return
        }
        setEmployeeId(row.employeeId)
        setType(row.type)
        setDescription(row.description)
        setIncidentDate(row.incident?.date ?? TODAY)
        setIncidentTime(row.incident?.time ?? '')
        setIncidentLocation(row.incident?.location ?? '')
        setIncidentDetails(row.incident?.details ?? '')
        setPolicyReference(row.incident?.policyReference ?? '')
        setCodeOfConductReference(row.incident?.codeOfConductReference ?? '')
        setActionCategory(row.proposedAction?.category ?? '')
        setActionTargetDate(row.proposedAction?.targetDate ?? '')
        setNextExpectedAction(row.repeatIncident?.nextExpectedAction ?? '')
        setLinkedPreviousRecordId(row.repeatIncident?.linkedPreviousRecordId ?? '')
        setValidityDays(row.validityDays === null || row.validityDays === undefined ? '' : String(row.validityDays))
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
  }, [recordId, navigate, toast])

  // On a new record the validity field follows the selected type's default; on
  // an edit the stored override is loaded above and left alone.
  useEffect(() => {
    if (isEdit) return
    const days = validityDaysFor(type)
    setValidityDays(days === null ? '' : String(days))
  }, [type, isEdit])

  // §35 Rule 6 — prior communications for the selected employee, as context.
  useEffect(() => {
    if (!employeeId) {
      setPriorRecords([])
      return
    }
    let cancelled = false
    void service
      .listCommunicationRecords(employeeId)
      .then((rows) => {
        if (!cancelled) setPriorRecords(rows.filter((row) => row.id !== recordId))
      })
      .catch(() => {
        if (!cancelled) setPriorRecords([])
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, recordId])

  const selected = useMemo(() => employees.find((employee) => employee.id === employeeId), [employees, employeeId])

  const canSubmit =
    employeeId !== '' && description.trim() !== '' && incidentDate !== '' && incidentDetails.trim() !== '' && !submitting

  /**
   * The heaviest sanction already on record. Shown so HR can see where the
   * ladder currently stands — §35 Rule 4 forbids acting on it automatically.
   */
  const heaviestPrior = useMemo(() => {
    const ranked = priorRecords
      .filter((row) => row.status === 'active' || row.status === 'open')
      .sort((a, b) => DISCIPLINARY_TYPE_RANK[b.type] - DISCIPLINARY_TYPE_RANK[a.type])
    return ranked[0] ?? null
  }, [priorRecords])

  async function handleSave() {
    setSubmitting(true)
    try {
      const input: service.CommunicationFormInput = {
        type,
        description: description.trim(),
        incident: {
          date: incidentDate || undefined,
          time: incidentTime || undefined,
          location: incidentLocation.trim() || undefined,
          details: incidentDetails.trim() || undefined,
          policyReference: policyReference.trim() || undefined,
          codeOfConductReference: codeOfConductReference.trim() || undefined,
        },
        proposedAction: {
          category: actionCategory || undefined,
          targetDate: actionTargetDate || undefined,
        },
        repeatIncident: {
          nextExpectedAction: nextExpectedAction || undefined,
          linkedPreviousRecordId: linkedPreviousRecordId || undefined,
        },
        validityDays: validityDays === '' ? null : Number(validityDays),
      }

      if (recordId) {
        await service.updateCommunicationRecord({ ...input, recordId })
        toast.success('Draft updated.')
        navigate(`/communications/employee/${recordId}`)
        return
      }

      const { recordId: newId } = await service.createCommunicationRecord({ ...input, employeeId })
      toast.success('Draft saved. Review it, then submit for approval.')
      navigate(`/communications/employee/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the record.')
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isEdit ? 'Edit Communication Draft' : BILINGUAL.form.en}
        </h1>
        <p className="text-sm italic text-muted-foreground">{BILINGUAL.form.id}</p>
      </div>

      <Card>
        <CardHeader>
          <SectionTitle section="employeeInfo" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employeeId">Employee *</Label>
            <Select
              id="employeeId"
              value={employeeId}
              // The subject cannot change once the record exists — every
              // denormalized field and the approval route derive from it.
              disabled={isEdit}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select an employee…</option>
              {employees
                .filter((employee) => employee.status === 'active' || employee.id === employeeId)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeNumber})
                  </option>
                ))}
            </Select>
          </div>

          {selected && (
            <dl className="grid gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd className="text-foreground">{labelIn(DEPARTMENTS, selected.departmentId)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Outlet</dt>
                <dd className="text-foreground">{labelIn(OUTLETS, selected.outletId)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Position</dt>
                <dd className="text-foreground">
                  {POSITION_LABELS[selected.position as keyof typeof POSITION_LABELS] ?? selected.position}
                </dd>
              </div>
            </dl>
          )}

          {priorRecords.length > 0 && (
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Previous communications
                {heaviestPrior && ` · heaviest in force: ${DISCIPLINARY_TYPE_LABELS[heaviestPrior.type]}`}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                {priorRecords.slice(0, 5).map((row) => (
                  <li key={row.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {formatDate(row.incident?.date ?? row.createdAt)} · {DISCIPLINARY_TYPE_LABELS[row.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">{COMMUNICATION_STATUS_LABELS[row.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="communicationDetails" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type of action / notification *</Label>
              <Select id="type" value={type} onChange={(e) => setType(e.target.value as DisciplinaryType)}>
                {Object.entries(DISCIPLINARY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="validityDays">Validity (days)</Label>
              <Input
                id="validityDays"
                type="number"
                min={1}
                max={3650}
                inputMode="numeric"
                placeholder="No expiry"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Counted from the day the employee acknowledges receipt. Leave empty for no expiry.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Summary *</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              maxLength={5000}
              placeholder="One line the register can show — e.g. Repeated late arrival."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incidentDate">Incident date *</Label>
              <Input
                id="incidentDate"
                type="date"
                max={TODAY}
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incidentTime">Time</Label>
              <Input
                id="incidentTime"
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incidentLocation">Location</Label>
              <Input
                id="incidentLocation"
                value={incidentLocation}
                maxLength={500}
                onChange={(e) => setIncidentLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incidentDetails">Details of communication / incident *</Label>
            <Textarea
              id="incidentDetails"
              rows={6}
              value={incidentDetails}
              maxLength={5000}
              placeholder="Full description, the circumstances, and who was present."
              onChange={(e) => setIncidentDetails(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codeOfConductReference">Code of Conduct reference</Label>
              <Input
                id="codeOfConductReference"
                value={codeOfConductReference}
                maxLength={500}
                onChange={(e) => setCodeOfConductReference(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policyReference">Disciplinary procedure reference</Label>
              <Input
                id="policyReference"
                value={policyReference}
                maxLength={500}
                onChange={(e) => setPolicyReference(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="proposedAction" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actionCategory">Category</Label>
              <Select
                id="actionCategory"
                value={actionCategory}
                onChange={(e) => setActionCategory(e.target.value as ProposedActionCategory | '')}
              >
                <option value="">Not specified</option>
                {Object.entries(PROPOSED_ACTION_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actionTargetDate">Target date</Label>
              <Input
                id="actionTargetDate"
                type="date"
                value={actionTargetDate}
                onChange={(e) => setActionTargetDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="repeatIncident" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextExpectedAction">Next expected action</Label>
              <Select
                id="nextExpectedAction"
                value={nextExpectedAction}
                onChange={(e) => setNextExpectedAction(e.target.value as DisciplinaryType | '')}
              >
                <option value="">Not specified</option>
                {Object.entries(DISCIPLINARY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedPreviousRecordId">Linked previous communication</Label>
              <Select
                id="linkedPreviousRecordId"
                value={linkedPreviousRecordId}
                disabled={priorRecords.length === 0}
                onChange={(e) => setLinkedPreviousRecordId(e.target.value)}
              >
                <option value="">{priorRecords.length === 0 ? 'No previous records' : 'None'}</option>
                {priorRecords.map((row) => (
                  <option key={row.id} value={row.id}>
                    {formatDate(row.incident?.date ?? row.createdAt)} · {DISCIPLINARY_TYPE_LABELS[row.type]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Save draft'}
        </Button>
      </div>
    </div>
  )
}
