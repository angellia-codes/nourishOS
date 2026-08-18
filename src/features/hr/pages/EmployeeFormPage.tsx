import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { ErrorMessage } from '@/components/shared'
import { useToast } from '@/hooks'
import { OUTLETS, DEPARTMENTS, OUTLET_DEPARTMENTS, optionsFor, type OrgOption } from '@/constants'
import { POSITION_LABELS, positionsFor, type PositionId } from '@/constants/positions'
import {
  CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS,
  DISCIPLINARY_TYPE,
  DISCIPLINARY_TYPE_LABELS,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_LABELS,
  GENDERS,
  PROBATION_STATUS,
  PROBATION_STATUS_LABELS,
  RELIGION,
  RELIGION_LABELS,
  TAX_STATUS,
  TAX_STATUS_LABELS,
  type ContractType,
  type DisciplinaryType,
  type EmploymentStatus,
  type Gender,
  type ProbationStatus,
  type Religion,
  type TaxStatus,
} from '@/constants/hr'
import * as employeeService from '@/features/hr/services/employeeService'
import { getCandidate } from '@/features/recruitment/recruitmentService'
import { ApiError } from '@/services/api'
import type { Employee } from '@/types'

interface EmployeeFormState {
  fullName: string
  gender: Gender
  birthDate: string
  nationalId: string
  taxNumber: string
  religion: Religion | ''
  phone: string
  email: string
  address: string
  permanentAddress: string
  domicileAddress: string
  emergencyContactName: string
  emergencyContactPhone: string
  motherName: string
  bpjsTk: string
  bpjsKesehatan: string
  personalTaxStatus: TaxStatus | ''
  position: string
  departmentId: string
  outletId: string
  employmentStatus: EmploymentStatus
  joinDate: string
  probationMonths: string
  /** Edit-only — a new hire always starts 'pending' server-side, so this isn't offered on create. */
  probationStatus: ProbationStatus | ''
  contractType: ContractType
  contractStartDate: string
  contractEndDate: string
  disciplinaryType: DisciplinaryType | ''
  disciplinaryStartPeriod: string
  disciplinaryEndPeriod: string
  recognitionType: string
  recognitionPeriod: string
}

const EMPTY_FORM: EmployeeFormState = {
  fullName: '',
  gender: 'male',
  birthDate: '',
  nationalId: '',
  taxNumber: '',
  religion: '',
  phone: '',
  email: '',
  address: '',
  permanentAddress: '',
  domicileAddress: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  motherName: '',
  bpjsTk: '',
  bpjsKesehatan: '',
  personalTaxStatus: '',
  position: '',
  departmentId: '',
  outletId: '',
  employmentStatus: EMPLOYMENT_STATUS.FIXED_TERM,
  joinDate: '',
  probationMonths: '3',
  probationStatus: '',
  contractType: 'fixedTerm',
  contractStartDate: '',
  contractEndDate: '',
  disciplinaryType: '',
  disciplinaryStartPeriod: '',
  disciplinaryEndPeriod: '',
  recognitionType: '',
  recognitionPeriod: '',
}

function toFormState(employee: Employee): EmployeeFormState {
  return {
    fullName: employee.fullName,
    gender: employee.gender,
    birthDate: employee.birthDate,
    nationalId: employee.nationalId ?? '',
    taxNumber: employee.taxNumber ?? '',
    religion: (employee.religion as Religion | undefined) ?? '',
    phone: employee.phone,
    email: employee.email,
    address: employee.address ?? '',
    permanentAddress: employee.permanentAddress ?? '',
    domicileAddress: employee.domicileAddress ?? '',
    emergencyContactName: employee.emergencyContactName ?? '',
    emergencyContactPhone: employee.emergencyContactPhone ?? '',
    motherName: employee.motherName ?? '',
    bpjsTk: employee.bpjsTk ?? '',
    bpjsKesehatan: employee.bpjsKesehatan ?? '',
    personalTaxStatus: (employee.personalTaxStatus as TaxStatus | undefined) ?? '',
    position: employee.position,
    departmentId: employee.departmentId,
    outletId: employee.outletId,
    employmentStatus: employee.employmentStatus,
    joinDate: employee.joinDate,
    probationMonths: String(employee.probationMonths),
    probationStatus: (employee.probationStatus as ProbationStatus | undefined) ?? '',
    contractType: employee.contractType,
    contractStartDate: employee.contractStartDate ?? '',
    contractEndDate: employee.contractEndDate ?? '',
    disciplinaryType: employee.disciplinaryType ?? '',
    disciplinaryStartPeriod: employee.disciplinaryStartPeriod ?? '',
    disciplinaryEndPeriod: employee.disciplinaryEndPeriod ?? '',
    recognitionType: employee.recognitionType ?? '',
    recognitionPeriod: employee.recognitionPeriod ?? '',
  }
}

/**
 * Create + edit form for the Employee Database (HR.md §5). Client checks
 * only completeness for immediate feedback — uniqueness, date rules, and
 * the employee-number sequence are enforced by the Cloud Functions.
 */
export function EmployeeFormPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const isEdit = Boolean(employeeId)
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  // Opened from an onboarding checklist: prefill what recruitment already knows
  // and link the two records on save. Everything an employee record needs and a
  // candidate record doesn't have (birth date, NIK, contract terms) is still
  // typed here — which is exactly why hiring doesn't create the employee itself.
  const candidateId = searchParams.get('candidateId')

  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    employeeService.getEmployee(employeeId).then((employee) => {
      if (cancelled) return
      if (!employee) {
        setNotFound(true)
      } else {
        setForm(toFormState(employee))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (!candidateId || employeeId) return
    let cancelled = false
    getCandidate(candidateId).then((candidate) => {
      if (cancelled || !candidate) return
      setForm((prev) => ({
        ...prev,
        fullName: candidate.fullName,
        phone: candidate.phone,
        email: candidate.email ?? '',
        position: candidate.positionApplied,
        departmentId: candidate.departmentId ?? prev.departmentId,
        outletId: candidate.outletId ?? prev.outletId,
        joinDate: candidate.joinDate ?? prev.joinDate,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [candidateId, employeeId])

  function set<K extends keyof EmployeeFormState>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  // A legacy record's stored outlet/department might not be in the org chart
  // (these were free-text fields before this dropdown existed) — keep it
  // selectable rather than silently blanking a value the form can't
  // otherwise represent.
  const outletOptions: OrgOption[] = useMemo(() => {
    if (form.outletId && !OUTLETS.some((o) => o.id === form.outletId)) {
      return [...OUTLETS, { id: form.outletId, name: `${form.outletId} (legacy)` }]
    }
    return [...OUTLETS]
  }, [form.outletId])

  const departmentOptions: OrgOption[] = useMemo(() => {
    const opts = optionsFor(OUTLET_DEPARTMENTS[form.outletId] ?? [], DEPARTMENTS)
    if (form.departmentId && !opts.some((d) => d.id === form.departmentId)) {
      const legacy = DEPARTMENTS.find((d) => d.id === form.departmentId)
      return [...opts, legacy ?? { id: form.departmentId, name: `${form.departmentId} (legacy)` }]
    }
    return opts
  }, [form.outletId, form.departmentId])

  // position was a free-text field before this revision — same legacy
  // fallback shape as outletOptions/departmentOptions/religionOptions, so an
  // existing value that predates the catalog (or came from a candidate's
  // free-text positionApplied) stays selectable rather than silently blanking.
  const positionOptions: { id: string; name: string }[] = useMemo(() => {
    const ids = positionsFor(form.outletId, form.departmentId)
    const base = ids.map((id) => ({ id, name: POSITION_LABELS[id] }))
    if (form.position && !ids.includes(form.position as PositionId)) {
      return [...base, { id: form.position, name: `${form.position} (legacy)` }]
    }
    return base
  }, [form.outletId, form.departmentId, form.position])

  // religion was a free-text field before this revision — a legacy value
  // that doesn't match the enum stays selectable rather than silently
  // blanking, same fallback shape as outletOptions above.
  const religionOptions: { id: Religion | string; name: string }[] = useMemo(() => {
    const base = Object.values(RELIGION).map((value) => ({ id: value, name: RELIGION_LABELS[value] }))
    if (form.religion && !Object.values(RELIGION).includes(form.religion)) {
      return [...base, { id: form.religion, name: `${form.religion} (legacy)` }]
    }
    return base
  }, [form.religion])

  const requiredFilled =
    form.fullName.trim() &&
    form.birthDate &&
    form.phone.trim() &&
    form.email.trim() &&
    form.position.trim() &&
    form.departmentId.trim() &&
    form.outletId.trim() &&
    form.joinDate &&
    (form.contractType !== 'fixedTerm' || form.contractEndDate)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!requiredFilled || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    const payload: employeeService.CreateEmployeeInput = {
      fullName: form.fullName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      nationalId: form.nationalId.trim() || undefined,
      taxNumber: form.taxNumber.trim() || undefined,
      religion: form.religion || undefined,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim() || undefined,
      permanentAddress: form.permanentAddress.trim() || undefined,
      domicileAddress: form.domicileAddress.trim() || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      motherName: form.motherName.trim() || undefined,
      bpjsTk: form.bpjsTk.trim() || undefined,
      bpjsKesehatan: form.bpjsKesehatan.trim() || undefined,
      personalTaxStatus: form.personalTaxStatus || undefined,
      position: form.position.trim(),
      departmentId: form.departmentId.trim(),
      outletId: form.outletId.trim(),
      employmentStatus: form.employmentStatus,
      joinDate: form.joinDate,
      probationMonths: Number(form.probationMonths) || 0,
      contractType: form.contractType,
      contractStartDate: form.contractStartDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      disciplinaryType: form.disciplinaryType || undefined,
      disciplinaryStartPeriod: form.disciplinaryStartPeriod || undefined,
      disciplinaryEndPeriod: form.disciplinaryEndPeriod || undefined,
      recognitionType: form.recognitionType.trim() || undefined,
      recognitionPeriod: form.recognitionPeriod || undefined,
      candidateId: candidateId ?? undefined,
    }

    try {
      if (isEdit && employeeId) {
        await employeeService.updateEmployee(employeeId, {
          ...payload,
          probationStatus: form.probationStatus || undefined,
        })
        toast.success('Employee updated.')
        navigate(`/hr/employees/${employeeId}`)
      } else {
        const result = await employeeService.createEmployee(payload)
        toast.success(`Employee created (${result.employeeNumber}).`)
        navigate(`/hr/employees/${result.employeeId}`)
      }
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
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

  if (notFound) {
    return <ErrorMessage message="Employee not found." />
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'The employee number cannot be changed.'
              : 'The employee number is assigned automatically on save.'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender">Gender *</Label>
            <Select id="gender" value={form.gender} onChange={set('gender')}>
              {Object.values(GENDERS).map((gender) => (
                <option key={gender} value={gender}>
                  {gender === 'male' ? 'Male' : 'Female'}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate">Birth date *</Label>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={set('birthDate')} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nationalId">National ID (NIK)</Label>
            <Input id="nationalId" value={form.nationalId} onChange={set('nationalId')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxNumber">Tax number (NPWP)</Label>
            <Input id="taxNumber" value={form.taxNumber} onChange={set('taxNumber')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="religion">Religion</Label>
            <Select id="religion" value={form.religion} onChange={set('religion')}>
              <option value="">Select a religion…</option>
              {religionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="62812…" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={form.address} onChange={set('address')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergencyContactName">Emergency contact name</Label>
            <Input id="emergencyContactName" value={form.emergencyContactName} onChange={set('emergencyContactName')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              value={form.emergencyContactPhone}
              onChange={set('emergencyContactPhone')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employmentStatus">Employment status *</Label>
            <Select id="employmentStatus" value={form.employmentStatus} onChange={set('employmentStatus')}>
              {Object.values(EMPLOYMENT_STATUS).map((value) => (
                <option key={value} value={value}>
                  {EMPLOYMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="outletId">Outlet *</Label>
            <Select
              id="outletId"
              value={form.outletId}
              onChange={(e) => setForm((prev) => ({ ...prev, outletId: e.target.value, departmentId: '', position: '' }))}
            >
              <option value="">Select an outlet…</option>
              {outletOptions.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departmentId">Department *</Label>
            <Select
              id="departmentId"
              value={form.departmentId}
              disabled={form.outletId === ''}
              onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value, position: '' }))}
            >
              <option value="">{form.outletId === '' ? 'Select an outlet first' : 'Select a department…'}</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position">Position *</Label>
            <Select id="position" value={form.position} disabled={form.departmentId === ''} onChange={set('position')}>
              <option value="">{form.departmentId === '' ? 'Select a department first' : 'Select a position…'}</option>
              {positionOptions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="joinDate">Join date *</Label>
            <Input id="joinDate" type="date" value={form.joinDate} onChange={set('joinDate')} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="probationMonths">Probation (months)</Label>
            <Input
              id="probationMonths"
              type="number"
              min={0}
              max={12}
              value={form.probationMonths}
              onChange={set('probationMonths')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractType">Contract type *</Label>
            <Select id="contractType" value={form.contractType} onChange={set('contractType')}>
              {Object.values(CONTRACT_TYPE).map((value) => (
                <option key={value} value={value}>
                  {CONTRACT_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractStartDate">Contract start</Label>
            <Input id="contractStartDate" type="date" value={form.contractStartDate} onChange={set('contractStartDate')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractEndDate">
              Contract end {form.contractType === 'fixedTerm' ? '*' : ''}
            </Label>
            <Input id="contractEndDate" type="date" value={form.contractEndDate} onChange={set('contractEndDate')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disciplinary & Recognition</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disciplinaryType">Disciplinary action</Label>
            <Select id="disciplinaryType" value={form.disciplinaryType} onChange={set('disciplinaryType')}>
              <option value="">None</option>
              {Object.values(DISCIPLINARY_TYPE).map((value) => (
                <option key={value} value={value}>
                  {DISCIPLINARY_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disciplinaryStartPeriod">Disciplinary period start</Label>
            <Input
              id="disciplinaryStartPeriod"
              type="date"
              value={form.disciplinaryStartPeriod}
              onChange={set('disciplinaryStartPeriod')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disciplinaryEndPeriod">Disciplinary period end</Label>
            <Input
              id="disciplinaryEndPeriod"
              type="date"
              value={form.disciplinaryEndPeriod}
              onChange={set('disciplinaryEndPeriod')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognitionType">Recognition</Label>
            <Input id="recognitionType" value={form.recognitionType} onChange={set('recognitionType')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognitionPeriod">Recognition period</Label>
            <Input id="recognitionPeriod" type="date" value={form.recognitionPeriod} onChange={set('recognitionPeriod')} />
          </div>
        </CardContent>
      </Card>

      {submitError && <ErrorMessage message={submitError} />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!requiredFilled} loading={submitting}>
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </Button>
      </div>
    </form>
  )
}
