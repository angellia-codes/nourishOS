import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, ErrorMessage, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, DEPARTMENTS, OUTLETS, PERMISSIONS } from '@/constants'
import { CONTRACT_TYPE_LABELS } from '@/constants/hr'
import { useAuth, useFirestoreQuery, usePermissions, useToast } from '@/hooks'
import { where, orderBy } from '@/services/firestore'
import { ApiError } from '@/services/api'
import * as recruitmentService from '../recruitmentService'
import {
  CANDIDATE_STAGE_ICON,
  CANDIDATE_STAGE_TONE,
  EMPLOYMENT_TYPE_LABELS,
  REQUISITION_STATUS_ICON,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_TONE,
  REQUISITION_TYPE_LABELS,
} from '../recruitmentFormat'
import { CANDIDATE_STAGE_LABELS, type Candidate, type FileMetadata, type Requisition, type RequisitionCompensation } from '@/types'

const LIST_ROUTE = '/recruitment/requisitions'
const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((outlet) => [outlet.id, outlet.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.id, department.name]),
)

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * One requisition: its fields, where it is in the approval chain, and the
 * candidates raised against it. Submit and Cancel live here rather than on the
 * form, because both are transitions rather than edits.
 */
export function RequisitionDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { requisitionId } = useParams<{ requisitionId: string }>()

  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const load = useCallback(async () => {
    if (!requisitionId) return
    const row = await recruitmentService.getRequisition(requisitionId)
    setRequisition(row)
    if (row) {
      setCandidates(await recruitmentService.listCandidatesForRequisition(requisitionId))
    }
    setLoading(false)
  }, [requisitionId])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  // Compensation — employee-requisition.md §3-C, hrManager/generalManager/director/superAdmin only.
  const [compensation, setCompensation] = useState<RequisitionCompensation | null>(null)
  const [loadingCompensation, setLoadingCompensation] = useState(false)
  const [showCompensationForm, setShowCompensationForm] = useState(false)
  const [compensationForm, setCompensationForm] = useState({
    salaryMin: '',
    salaryMax: '',
    positionAllowance: '',
    phoneAllowance: '',
    transportationAllowance: '',
  })
  const [savingCompensation, setSavingCompensation] = useState(false)
  const [compensationError, setCompensationError] = useState<string | null>(null)

  useEffect(() => {
    if (!requisitionId || !can(PERMISSIONS.RECRUITMENT_VIEW_COMPENSATION)) return
    let cancelled = false
    setLoadingCompensation(true)
    recruitmentService
      .getRequisitionCompensation(requisitionId)
      .then((result) => {
        if (cancelled) return
        setCompensation(result)
        setLoadingCompensation(false)
      })
      .catch(() => {
        if (cancelled) return
        setCompensationError('Failed to load compensation.')
        setLoadingCompensation(false)
      })
    return () => {
      cancelled = true
    }
  }, [requisitionId, can])

  function openCompensationForm() {
    setCompensationForm({
      salaryMin: compensation?.salaryMin != null ? String(compensation.salaryMin) : '',
      salaryMax: compensation?.salaryMax != null ? String(compensation.salaryMax) : '',
      positionAllowance: compensation?.positionAllowance != null ? String(compensation.positionAllowance) : '',
      phoneAllowance: compensation?.phoneAllowance != null ? String(compensation.phoneAllowance) : '',
      transportationAllowance:
        compensation?.transportationAllowance != null ? String(compensation.transportationAllowance) : '',
    })
    setCompensationError(null)
    setShowCompensationForm(true)
  }

  async function handleSaveCompensation() {
    if (!requisitionId || savingCompensation) return
    setSavingCompensation(true)
    setCompensationError(null)
    try {
      await recruitmentService.updateRequisitionCompensation(requisitionId, {
        salaryMin: Number(compensationForm.salaryMin) || 0,
        salaryMax: Number(compensationForm.salaryMax) || 0,
        positionAllowance: compensationForm.positionAllowance ? Number(compensationForm.positionAllowance) : undefined,
        phoneAllowance: compensationForm.phoneAllowance ? Number(compensationForm.phoneAllowance) : undefined,
        transportationAllowance: compensationForm.transportationAllowance
          ? Number(compensationForm.transportationAllowance)
          : undefined,
      })
      const result = await recruitmentService.getRequisitionCompensation(requisitionId)
      setCompensation(result)
      setShowCompensationForm(false)
      toast.success('Compensation updated.')
    } catch (error) {
      setCompensationError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSavingCompensation(false)
    }
  }

  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    requisitionId
      ? [
          where('resourceType', '==', 'requisitionAttachment'),
          where('resourceId', '==', requisitionId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [requisitionId],
  )

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!requisition || !requisitionId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not found"
          description="That requisition no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to requisitions
            </Button>
          }
        />
      </div>
    )
  }

  // A const narrowed by the guard above re-widens inside these closures, so the
  // id is pulled into a plain local first (see CLAUDE.md § frontend gotchas).
  const id = requisitionId
  const isOwner = requisition.createdBy === profile?.uid
  const canManage = can(PERMISSIONS.RECRUITMENT_UPDATE)
  const canAct = isOwner || canManage

  async function handleSubmit() {
    setBusy(true)
    try {
      const { requisitionNumber } = await recruitmentService.submitRequisition(id)
      toast.success(`${requisitionNumber} submitted for approval.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(confirm: boolean) {
    setBusy(true)
    try {
      await recruitmentService.cancelRequisition(id, cancelReason.trim(), confirm)
      toast.success('Requisition cancelled.')
      await load()
      setConfirmingCancel(false)
    } catch (error) {
      // The server refuses once, with a message about live candidates; the
      // second press passes confirm and goes through.
      toast.error(error instanceof Error ? error.message : 'Could not cancel.')
    } finally {
      setBusy(false)
    }
  }

  const canAddCandidates = requisition.status === 'approved' && can(PERMISSIONS.RECRUITMENT_CREATE)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_ROUTE)} aria-label="Back to requisitions">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{requisition.requisitionNumber ?? 'Draft'}</p>
            <h1 className="text-xl font-semibold text-foreground">
              {requisition.openings} × {requisition.position}
            </h1>
          </div>
        </div>
        <StatusPill
          tone={REQUISITION_STATUS_TONE[requisition.status]}
          icon={REQUISITION_STATUS_ICON[requisition.status]}
          label={REQUISITION_STATUS_LABELS[requisition.status]}
        />
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Outlet" value={OUTLET_NAMES[requisition.outletId] ?? requisition.outletId} />
          <Field label="Department" value={DEPARTMENT_NAMES[requisition.departmentId] ?? requisition.departmentId} />
          <Field label="Employment type" value={EMPLOYMENT_TYPE_LABELS[requisition.employmentType] ?? requisition.employmentType} />
          {requisition.contractType && (
            <Field label="Contract type" value={CONTRACT_TYPE_LABELS[requisition.contractType]} />
          )}
          <Field label="Requisition type" value={REQUISITION_TYPE_LABELS[requisition.requisitionType] ?? requisition.requisitionType} />
          <Field label="Target join date" value={requisition.targetJoinDate} />
          <Field label="Budgeted" value={requisition.budgeted ? 'Yes' : 'No'} />
          <Field label="Filled" value={`${requisition.filledCount} of ${requisition.openings}`} />
          <Field label="Vacancy stage" value={requisition.vacancyStage ?? 'Not open yet'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Justification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4 pt-0 text-sm text-foreground">
          <p className="whitespace-pre-wrap">{requisition.justification}</p>
          <Field label="Key responsibilities" value={requisition.responsibilities} />
          <Field label="Requirements" value={requisition.requirements} />
          <Field label="Work schedule" value={requisition.workSchedule} />
        </CardContent>
      </Card>

      {/* Compensation — §3-C salary range/allowances, hrManager/GM/Director/superAdmin only */}
      <PermissionGuard permission={PERMISSIONS.RECRUITMENT_VIEW_COMPENSATION}>
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
                    <Label htmlFor="salaryMin">Salary min (IDR) *</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      min={0}
                      value={compensationForm.salaryMin}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, salaryMin: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="salaryMax">Salary max (IDR) *</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      min={0}
                      value={compensationForm.salaryMax}
                      onChange={(e) => setCompensationForm((prev) => ({ ...prev, salaryMax: e.target.value }))}
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
                </div>
                {compensationError && <ErrorMessage message={compensationError} />}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowCompensationForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleSaveCompensation()}
                    disabled={!compensationForm.salaryMin || !compensationForm.salaryMax}
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
                <Field label="Salary range" value={`${compensation.salaryMin.toLocaleString('id-ID')} – ${compensation.salaryMax.toLocaleString('id-ID')}`} />
                <Field label="Position allowance" value={compensation.positionAllowance?.toLocaleString('id-ID') ?? '—'} />
                <Field label="Phone allowance" value={compensation.phoneAllowance?.toLocaleString('id-ID') ?? '—'} />
                <Field
                  label="Transportation allowance"
                  value={compensation.transportationAllowance?.toLocaleString('id-ID') ?? '—'}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No compensation data on file.</p>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Attachments — §3-D org chart excerpt, workload evidence, event brief */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canAct && <FileUpload module="hr" resourceType="requisitionAttachment" resourceId={id} />}
          <FileList files={attachments} />
        </CardContent>
      </Card>

      {canAct && requisition.status !== 'completed' && requisition.status !== 'cancelled' && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap gap-2">
              {requisition.status === 'draft' && (
                <>
                  <Button onClick={handleSubmit} loading={busy}>
                    Submit for approval
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/recruitment/requisitions/${id}/edit`)} disabled={busy}>
                    Edit draft
                  </Button>
                </>
              )}
              {canAddCandidates && (
                <Button onClick={() => navigate(`/recruitment/candidates/new?requisitionId=${id}`)} disabled={busy}>
                  <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add candidate
                </Button>
              )}
            </div>

            {confirmingCancel ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Cancellation reason"
                  className="w-56"
                  placeholder="Reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <Button variant="danger" onClick={() => handleCancel(true)} loading={busy}>
                  Confirm cancel
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={busy}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmingCancel(true)} disabled={busy}>
                Cancel requisition
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Candidates ({candidates.length})
        </h2>
        {candidates.length === 0 ? (
          <EmptyState
            title="No candidates yet"
            description={
              requisition.status === 'approved'
                ? 'Add the first applicant against this vacancy.'
                : 'Candidates can only be added once the requisition is approved.'
            }
          />
        ) : (
          candidates.map((candidate) => (
            <Card key={candidate.id} className="cursor-pointer" onClick={() => navigate(`/recruitment/candidates/${candidate.id}`)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{candidate.candidateNumber}</p>
                  <p className="font-medium text-foreground">{candidate.fullName}</p>
                </div>
                <StatusPill
                  tone={CANDIDATE_STAGE_TONE[candidate.currentStage]}
                  icon={CANDIDATE_STAGE_ICON[candidate.currentStage]}
                  label={CANDIDATE_STAGE_LABELS[candidate.currentStage]}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
