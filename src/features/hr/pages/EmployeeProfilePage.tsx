import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, Pencil } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  Textarea,
  Timeline,
  TimelineItem,
} from '@/components/ui'
import { ErrorMessage, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { useFirestoreDoc, useFirestoreQuery, usePermissions, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { CONTRACT_TYPE_LABELS, DISCIPLINARY_TYPE_LABELS, EMPLOYMENT_STATUS_LABELS } from '@/constants/hr'
import { POSITION_LABELS } from '@/constants/positions'
import * as employeeService from '@/features/hr/services/employeeService'
import * as disciplinaryService from '@/features/hr/disciplinary/disciplinaryService'
import * as contractService from '@/features/hr/contracts/contractService'
import * as trainingService from '@/features/hr/training/trainingService'
import * as offboardingService from '@/features/hr/offboarding/offboardingService'
import type { Contract, DisciplinaryRecord, Training, TrainingAssignment } from '@/types'
import {
  formatIsoDate,
  formatTenure,
  isContractExpiringSoon,
  isProbationEndingSoon,
} from '@/features/hr/utils/employeeIndicators'
import { formatDate, formatDateTime } from '@/utils'
import { ApiError } from '@/services/api'
import { where, orderBy } from '@/services/firestore'
import type { Employee, EmployeeActivity, EmployeeCompensation, FileMetadata } from '@/types'
import type { EmployeeAuditLogEntry } from '@/features/hr/services/employeeService'

function ContractStatusBadge({ status }: { status: Contract['status'] }) {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'terminated') return <Badge variant="error">Terminated</Badge>
  return <Badge variant="neutral">Superseded</Badge>
}

/**
 * One assignment row — its own component so the per-row certificate query
 * isn't a hook called inside a loop. No manual reload after completing: the
 * parent's assignments list is a live subscription, so the status flip
 * appears on its own.
 */
function TrainingAssignmentRow({
  assignment,
  trainingTitle,
}: {
  assignment: TrainingAssignment
  trainingTitle: string
}) {
  const toast = useToast()
  const [completing, setCompleting] = useState(false)
  const { data: certificates } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    assignment.status === 'completed'
      ? [
          where('resourceType', '==', 'trainingCertificate'),
          where('resourceId', '==', assignment.id),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [assignment.id, assignment.status],
  )

  async function handleComplete() {
    setCompleting(true)
    try {
      await trainingService.completeTraining(assignment.id)
      toast.success('Marked complete.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark complete.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{trainingTitle}</p>
          {assignment.dueDate && <p className="text-xs text-muted-foreground">Due {formatDate(assignment.dueDate)}</p>}
        </div>
        {assignment.status === 'completed' ? (
          <Badge variant="success">Completed</Badge>
        ) : (
          <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
            <Button variant="secondary" size="sm" disabled={completing} onClick={() => void handleComplete()}>
              {completing ? <Spinner className="h-4 w-4" /> : 'Mark complete'}
            </Button>
          </PermissionGuard>
        )}
      </div>
      {assignment.status === 'completed' && (
        <div className="flex flex-col gap-2">
          <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
            <FileUpload module="hr" resourceType="trainingCertificate" resourceId={assignment.id} accept="application/pdf,image/*" />
          </PermissionGuard>
          <FileList files={certificates} />
        </div>
      )}
    </div>
  )
}

function describeAuditEntry(entry: EmployeeAuditLogEntry): string {
  const changed = entry.newValues ? Object.keys(entry.newValues) : []
  if (entry.action === 'create') return `${entry.userName} created this record.`
  if (changed.length > 0) return `${entry.userName} updated ${changed.join(', ')}.`
  return `${entry.userName} ${entry.action}d this record.`
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { can } = usePermissions()
  const { data: employee, loading } = useFirestoreDoc<Employee>(COLLECTIONS.EMPLOYEES, employeeId)
  const [activities, setActivities] = useState<EmployeeActivity[]>([])
  const [auditEntries, setAuditEntries] = useState<EmployeeAuditLogEntry[] | null>(null)
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[] | null>(null)
  const [contracts, setContracts] = useState<Contract[] | null>(null)
  const [trainingAssignments, setTrainingAssignments] = useState<TrainingAssignment[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    disciplinaryService.listDisciplinaryRecords(employeeId).then((rows) => {
      if (!cancelled) setDisciplinaryRecords(rows)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    contractService.listContractsForEmployee(employeeId).then((rows) => {
      if (!cancelled) setContracts(rows)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) return
    return trainingService.subscribeToAssignmentsForEmployee(employeeId, setTrainingAssignments)
  }, [employeeId])

  useEffect(() => trainingService.subscribeToTrainings(setTrainings), [])

  const trainingTitleById = useMemo(() => Object.fromEntries(trainings.map((t) => [t.id, t.title])), [trainings])

  const { data: documents } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    employeeId
      ? [
          where('resourceType', '==', 'employee'),
          where('resourceId', '==', employeeId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [employeeId],
  )

  const { data: contractFiles } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    employeeId
      ? [
          where('resourceType', '==', 'employeeContract'),
          where('resourceId', '==', employeeId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [employeeId],
  )

  const [showArchiveForm, setShowArchiveForm] = useState(false)
  const [resignationDate, setResignationDate] = useState('')
  const [resignationReason, setResignationReason] = useState('')
  const [lastWorkingDate, setLastWorkingDate] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [offboardingChecklistId, setOffboardingChecklistId] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    offboardingService.getOffboardingChecklistForEmployee(employeeId).then((row) => {
      if (!cancelled) setOffboardingChecklistId(row?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) return
    return employeeService.subscribeToEmployeeActivities(employeeId, setActivities)
  }, [employeeId])

  useEffect(() => {
    if (!employeeId || !can(PERMISSIONS.EMPLOYEES_UPDATE)) return
    let cancelled = false
    employeeService.getEmployeeAuditLog(employeeId).then((result) => {
      if (!cancelled) setAuditEntries(result.entries)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId, can])

  // §12.1 — hrManager/superAdmin only; firestore.rules blocks this read for
  // everyone else, so don't even attempt it without the permission.
  const [compensation, setCompensation] = useState<EmployeeCompensation | null>(null)
  const [loadingCompensation, setLoadingCompensation] = useState(false)
  const [showCompensationForm, setShowCompensationForm] = useState(false)
  const [compensationForm, setCompensationForm] = useState({
    basicSalary: '',
    positionAllowance: '',
    phoneAllowance: '',
    transportationAllowance: '',
    bankAccountName: '',
    bankAccountNumber: '',
  })
  const [savingCompensation, setSavingCompensation] = useState(false)
  const [compensationError, setCompensationError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId || !can(PERMISSIONS.EMPLOYEES_READ_SENSITIVE)) return
    let cancelled = false
    setLoadingCompensation(true)
    setCompensationError(null)
    employeeService
      .getEmployeeCompensation(employeeId)
      .then((result) => {
        if (cancelled) return
        setCompensation(result)
        setLoadingCompensation(false)
      })
      .catch((error) => {
        if (cancelled) return
        // Most likely cause: the ID token's role claim hasn't caught up with
        // a recent role change yet (root CLAUDE.md Gotchas — up to ~1h, or a
        // forced refresh) even though the client-side permission check above
        // already passed off the live Firestore profile.
        setCompensationError(
          error instanceof Error && 'code' in error && (error as { code?: string }).code === 'permission-denied'
            ? 'Access denied loading compensation — if your role changed recently, sign out and back in to refresh your session.'
            : 'Failed to load compensation.',
        )
        setLoadingCompensation(false)
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, can])

  function openCompensationForm() {
    setCompensationForm({
      basicSalary: compensation?.basicSalary != null ? String(compensation.basicSalary) : '',
      positionAllowance: compensation?.positionAllowance != null ? String(compensation.positionAllowance) : '',
      phoneAllowance: compensation?.phoneAllowance != null ? String(compensation.phoneAllowance) : '',
      transportationAllowance:
        compensation?.transportationAllowance != null ? String(compensation.transportationAllowance) : '',
      bankAccountName: compensation?.bankAccountName ?? '',
      bankAccountNumber: compensation?.bankAccountNumber ?? '',
    })
    setCompensationError(null)
    setShowCompensationForm(true)
  }

  async function handleSaveCompensation() {
    if (!employeeId || savingCompensation) return
    setSavingCompensation(true)
    setCompensationError(null)
    try {
      await employeeService.updateEmployeeCompensation(employeeId, {
        basicSalary: Number(compensationForm.basicSalary) || 0,
        positionAllowance: compensationForm.positionAllowance ? Number(compensationForm.positionAllowance) : undefined,
        phoneAllowance: compensationForm.phoneAllowance ? Number(compensationForm.phoneAllowance) : undefined,
        transportationAllowance: compensationForm.transportationAllowance
          ? Number(compensationForm.transportationAllowance)
          : undefined,
        bankAccountName: compensationForm.bankAccountName.trim() || undefined,
        bankAccountNumber: compensationForm.bankAccountNumber.trim() || undefined,
      })
      const result = await employeeService.getEmployeeCompensation(employeeId)
      setCompensation(result)
      setShowCompensationForm(false)
      toast.success('Compensation updated.')
    } catch (error) {
      setCompensationError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSavingCompensation(false)
    }
  }

  async function handleArchive() {
    if (!employeeId || !resignationDate || !resignationReason.trim() || !lastWorkingDate || archiving) return
    setArchiving(true)
    setArchiveError(null)
    try {
      const result = await employeeService.archiveEmployee(employeeId, resignationDate, resignationReason.trim(), lastWorkingDate)
      setOffboardingChecklistId(result.offboardingChecklistId)
      toast.success('Employee archived.')
      setShowArchiveForm(false)
    } catch (error) {
      setArchiveError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!employee) {
    return <ErrorMessage message="Employee not found — it may not exist or you may not have access to it." />
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/employees')} aria-label="Back to employees">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Avatar name={employee.fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
            {employee.status === 'active' ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="neutral">Inactive</Badge>
            )}
            {isProbationEndingSoon(employee) && <Badge variant="warning">Probation ending</Badge>}
            {isContractExpiringSoon(employee) && <Badge variant="error">Contract expiring</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.employeeNumber} &middot; {POSITION_LABELS[employee.position as keyof typeof POSITION_LABELS] ?? employee.position} &middot; Tenure {formatTenure(employee.joinDate)}
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/hr/employees/${employee.id}/edit`)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </PermissionGuard>
      </div>

      {/* Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Gender" value={employee.gender === 'male' ? 'Male' : 'Female'} />
          <Field label="Birth date" value={formatIsoDate(employee.birthDate)} />
          <Field label="National ID (NIK)" value={employee.nationalId} />
          <Field label="Tax number (NPWP)" value={employee.taxNumber} />
          <Field label="Religion" value={employee.religion} />
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Phone" value={employee.phone} />
          <Field label="Email" value={employee.email} />
          <Field label="Address" value={employee.address} />
          <Field label="Emergency contact" value={employee.emergencyContactName} />
          <Field label="Emergency phone" value={employee.emergencyContactPhone} />
        </CardContent>
      </Card>

      {/* Employment & contract */}
      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Employment status" value={EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]} />
          <Field label="Department" value={employee.departmentId} />
          <Field label="Outlet" value={employee.outletId} />
          <Field label="Join date" value={formatIsoDate(employee.joinDate)} />
          <Field
            label="Probation ends"
            value={employee.probationEndDate ? formatIsoDate(employee.probationEndDate) : 'No probation'}
          />
          <Field label="Contract type" value={CONTRACT_TYPE_LABELS[employee.contractType]} />
          <Field label="Contract start" value={formatIsoDate(employee.contractStartDate)} />
          <Field label="Contract end" value={formatIsoDate(employee.contractEndDate)} />
        </CardContent>
      </Card>

      {/* Compensation — §12.1 salary/allowances/bank, hrManager/superAdmin only */}
      <PermissionGuard permission={PERMISSIONS.EMPLOYEES_READ_SENSITIVE}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Compensation</CardTitle>
            {!showCompensationForm && (
              <Button variant="secondary" size="sm" onClick={openCompensationForm}>
                {compensation ? 'Edit' : 'Set compensation'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showCompensationForm ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="basicSalary">Basic salary *</Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      min={0}
                      value={compensationForm.basicSalary}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, basicSalary: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="positionAllowance">Position allowance</Label>
                    <Input
                      id="positionAllowance"
                      type="number"
                      min={0}
                      value={compensationForm.positionAllowance}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, positionAllowance: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phoneAllowance">Phone allowance</Label>
                    <Input
                      id="phoneAllowance"
                      type="number"
                      min={0}
                      value={compensationForm.phoneAllowance}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, phoneAllowance: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="transportationAllowance">Transportation allowance</Label>
                    <Input
                      id="transportationAllowance"
                      type="number"
                      min={0}
                      value={compensationForm.transportationAllowance}
                      onChange={(e) =>
                        setCompensationForm((prev) => ({ ...prev, transportationAllowance: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bankAccountName">Bank account name</Label>
                    <Input
                      id="bankAccountName"
                      value={compensationForm.bankAccountName}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, bankAccountName: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bankAccountNumber">Bank account number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={compensationForm.bankAccountNumber}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
                    />
                  </div>
                </div>
                {compensationError && <ErrorMessage message={compensationError} />}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowCompensationForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleSaveCompensation()}
                    disabled={!compensationForm.basicSalary}
                    loading={savingCompensation}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : loadingCompensation ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : compensationError ? (
              <ErrorMessage message={compensationError} />
            ) : compensation ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Basic salary" value={compensation.basicSalary.toLocaleString('id-ID')} />
                <Field label="Position allowance" value={compensation.positionAllowance?.toLocaleString('id-ID')} />
                <Field label="Phone allowance" value={compensation.phoneAllowance?.toLocaleString('id-ID')} />
                <Field
                  label="Transportation allowance"
                  value={compensation.transportationAllowance?.toLocaleString('id-ID')}
                />
                <Field label="Bank account name" value={compensation.bankAccountName} />
                <Field label="Bank account number" value={compensation.bankAccountNumber} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No compensation data on file.</p>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Disciplinary & Recognition — §12.1, shown only when set to keep the common case clean */}
      {(employee.disciplinaryType || employee.recognitionType) && (
        <Card>
          <CardHeader>
            <CardTitle>Disciplinary & Recognition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {employee.disciplinaryType && (
              <>
                <Field label="Disciplinary action" value={DISCIPLINARY_TYPE_LABELS[employee.disciplinaryType]} />
                <Field label="Period start" value={formatIsoDate(employee.disciplinaryStartPeriod)} />
                <Field label="Period end" value={formatIsoDate(employee.disciplinaryEndPeriod)} />
              </>
            )}
            {employee.recognitionType && (
              <>
                <Field label="Recognition" value={employee.recognitionType} />
                <Field label="Recognition period" value={formatIsoDate(employee.recognitionPeriod)} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disciplinary Records — FEATURE_SPECIFICATIONS.md Module 3, the detail layer (investigation notes)
          behind the summary card above. No auto-sync between the two; HR keeps both independently. */}
      <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Disciplinary Records</CardTitle>
            <Button
              variant="secondary"
              onClick={() => navigate(`/hr/employees/${employeeId}/disciplinary/new`)}
            >
              New Record
            </Button>
          </CardHeader>
          <CardContent>
            {disciplinaryRecords === null ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : disciplinaryRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No disciplinary records.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {disciplinaryRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => navigate(`/hr/employees/${employeeId}/disciplinary/${record.id}`)}
                    className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-left hover:bg-border/30"
                  >
                    <span className="text-sm text-foreground">{DISCIPLINARY_TYPE_LABELS[record.type]}</span>
                    <Badge variant={record.status === 'open' ? 'warning' : 'neutral'}>
                      {record.status === 'open' ? 'Open' : 'Closed'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Contract History — HR.md §9, version-history behind Employment's flat contractType/dates above */}
      <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Contract History</CardTitle>
            <div className="flex gap-2">
              {contracts?.some((c) => c.status === 'active') && (
                <Button variant="secondary" size="sm" onClick={() => navigate(`/hr/employees/${employeeId}/contracts/terminate`)}>
                  Terminate
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => navigate(`/hr/employees/${employeeId}/contracts/renew`)}>
                Renew
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contracts === null ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contract history.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm text-foreground">
                        v{contract.version} · {CONTRACT_TYPE_LABELS[contract.contractType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatIsoDate(contract.contractStartDate)} – {contract.contractEndDate ? formatIsoDate(contract.contractEndDate) : 'No end date'}
                      </p>
                    </div>
                    <ContractStatusBadge status={contract.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Training — HR.md §11 */}
      <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
        <Card>
          <CardHeader>
            <CardTitle>Training</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No training assigned.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {trainingAssignments.map((assignment) => (
                  <TrainingAssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    trainingTitle={trainingTitleById[assignment.trainingId] ?? assignment.trainingId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Contract — a distinct, PDF-only slot alongside the generic Documents bucket below */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Document</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
            <FileUpload module="hr" resourceType="employeeContract" resourceId={employee.id} accept="application/pdf" />
          </PermissionGuard>
          <FileList files={contractFiles} />
        </CardContent>
      </Card>

      {/* Documents — HR.md §5 (ID card, NPWP, BPJS, certificates) via the generic File Storage service */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
            <FileUpload module="hr" resourceType="employee" resourceId={employee.id} />
          </PermissionGuard>
          <FileList files={documents} />
        </CardContent>
      </Card>

      {/* Separation details, once archived */}
      {employee.status === 'inactive' && (
        <Card>
          <CardHeader>
            <CardTitle>Separation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Resignation date" value={formatIsoDate(employee.resignationDate)} />
              <Field label="Last working date" value={formatIsoDate(employee.lastWorkingDate)} />
              <Field label="Reason" value={employee.resignationReason} />
            </div>
            {offboardingChecklistId && (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => navigate(`/hr/offboarding/${offboardingChecklistId}`)}>
                  View offboarding checklist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity timeline — HR.md §13 */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <Timeline>
              {activities.map((activity) => (
                <TimelineItem
                  key={activity.id}
                  title={activity.description}
                  timestamp={formatDateTime(activity.createdAt)}
                />
              ))}
            </Timeline>
          )}
        </CardContent>
      </Card>

      {/* Change history — 9.1-F07/F15, read via a callable since auditLogs blocks direct client reads */}
      <PermissionGuard permission={PERMISSIONS.EMPLOYEES_UPDATE}>
        <Card>
          <CardHeader>
            <CardTitle>Change History</CardTitle>
          </CardHeader>
          <CardContent>
            {auditEntries === null ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            ) : (
              <Timeline>
                {auditEntries.map((entry) => (
                  <TimelineItem key={entry.id} title={describeAuditEntry(entry)} timestamp={formatDateTime(entry.timestamp)} />
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Archive (soft delete) — E01-US03 */}
      {employee.status === 'active' && (
        <PermissionGuard permission={PERMISSIONS.EMPLOYEES_DELETE}>
          {showArchiveForm ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Archive employee</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Removes {employee.fullName} from active headcount. The record and its history are preserved and
                  remain visible under the Inactive filter.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="resignationDate">Resignation date *</Label>
                    <Input
                      id="resignationDate"
                      type="date"
                      value={resignationDate}
                      onChange={(e) => setResignationDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastWorkingDate">Last working date *</Label>
                    <Input
                      id="lastWorkingDate"
                      type="date"
                      min={resignationDate || undefined}
                      value={lastWorkingDate}
                      onChange={(e) => setLastWorkingDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="resignationReason">Reason *</Label>
                    <Textarea
                      id="resignationReason"
                      value={resignationReason}
                      onChange={(e) => setResignationReason(e.target.value)}
                    />
                  </div>
                </div>
                {archiveError && <ErrorMessage message={archiveError} />}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowArchiveForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleArchive}
                    disabled={!resignationDate || !resignationReason.trim() || !lastWorkingDate}
                    loading={archiving}
                  >
                    Confirm Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowArchiveForm(true)}>
                <Archive className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Archive employee…
              </Button>
            </div>
          )}
        </PermissionGuard>
      )}
    </div>
  )
}
