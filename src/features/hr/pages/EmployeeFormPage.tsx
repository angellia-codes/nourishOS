import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { ErrorMessage } from '@/components/shared'
import { useToast } from '@/hooks'
import {
  CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_LABELS,
  GENDERS,
  type ContractType,
  type EmploymentStatus,
  type Gender,
} from '@/constants/hr'
import * as employeeService from '@/features/hr/services/employeeService'
import { ApiError } from '@/services/api'
import type { Employee } from '@/types'

interface EmployeeFormState {
  fullName: string
  preferredName: string
  gender: Gender
  birthDate: string
  nationalId: string
  taxNumber: string
  religion: string
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  position: string
  departmentId: string
  outletId: string
  employmentStatus: EmploymentStatus
  joinDate: string
  probationMonths: string
  contractType: ContractType
  contractStartDate: string
  contractEndDate: string
}

const EMPTY_FORM: EmployeeFormState = {
  fullName: '',
  preferredName: '',
  gender: 'male',
  birthDate: '',
  nationalId: '',
  taxNumber: '',
  religion: '',
  phone: '',
  email: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  position: '',
  departmentId: '',
  outletId: '',
  employmentStatus: EMPLOYMENT_STATUS.FIXED_TERM,
  joinDate: '',
  probationMonths: '3',
  contractType: 'fixedTerm',
  contractStartDate: '',
  contractEndDate: '',
}

function toFormState(employee: Employee): EmployeeFormState {
  return {
    fullName: employee.fullName,
    preferredName: employee.preferredName ?? '',
    gender: employee.gender,
    birthDate: employee.birthDate,
    nationalId: employee.nationalId ?? '',
    taxNumber: employee.taxNumber ?? '',
    religion: employee.religion ?? '',
    phone: employee.phone,
    email: employee.email,
    address: employee.address ?? '',
    emergencyContactName: employee.emergencyContactName ?? '',
    emergencyContactPhone: employee.emergencyContactPhone ?? '',
    position: employee.position,
    departmentId: employee.departmentId,
    outletId: employee.outletId,
    employmentStatus: employee.employmentStatus,
    joinDate: employee.joinDate,
    probationMonths: String(employee.probationMonths),
    contractType: employee.contractType,
    contractStartDate: employee.contractStartDate ?? '',
    contractEndDate: employee.contractEndDate ?? '',
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

  function set<K extends keyof EmployeeFormState>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

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
      preferredName: form.preferredName.trim() || undefined,
      gender: form.gender,
      birthDate: form.birthDate,
      nationalId: form.nationalId.trim() || undefined,
      taxNumber: form.taxNumber.trim() || undefined,
      religion: form.religion.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim() || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      position: form.position.trim(),
      departmentId: form.departmentId.trim(),
      outletId: form.outletId.trim(),
      employmentStatus: form.employmentStatus,
      joinDate: form.joinDate,
      probationMonths: Number(form.probationMonths) || 0,
      contractType: form.contractType,
      contractStartDate: form.contractStartDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
    }

    try {
      if (isEdit && employeeId) {
        await employeeService.updateEmployee(employeeId, payload)
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
            <Label htmlFor="preferredName">Preferred name</Label>
            <Input id="preferredName" value={form.preferredName} onChange={set('preferredName')} />
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
            <Input id="religion" value={form.religion} onChange={set('religion')} />
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
            <Textarea id="address" value={form.address} onChange={set('address')} className="min-h-[72px]" />
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
            <Label htmlFor="position">Position *</Label>
            <Input id="position" value={form.position} onChange={set('position')} />
          </div>
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
            <Label htmlFor="departmentId">Department *</Label>
            <Input id="departmentId" value={form.departmentId} onChange={set('departmentId')} placeholder="kitchen" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="outletId">Outlet *</Label>
            <Input id="outletId" value={form.outletId} onChange={set('outletId')} placeholder="berawa" />
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
