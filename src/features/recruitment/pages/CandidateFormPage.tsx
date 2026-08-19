import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import { CANDIDATE_SOURCE_LABELS } from '../recruitmentFormat'
import type { Requisition } from '@/types'

const LIST_ROUTE = '/recruitment/candidates'

/**
 * Candidate intake — HR_OPERATIONS.md E04-US01.
 *
 * The requisition picker only offers approved requisitions, and the server
 * re-checks: a candidate with no approved vacancy behind them is the exact
 * thing the requisition module exists to prevent.
 *
 * The duplicate-phone warning is a server refusal the second submit overrides
 * (`allowDuplicate`), rather than a client-side lookup that a slow network
 * could skip.
 */
export function CandidateFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { candidateId } = useParams<{ candidateId: string }>()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(candidateId)

  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [requisitionId, setRequisitionId] = useState(searchParams.get('requisitionId') ?? '')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [positionApplied, setPositionApplied] = useState('')
  const [source, setSource] = useState('appliedDirectly')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (candidateId) {
          const row = await recruitmentService.getCandidate(candidateId)
          if (cancelled) return
          if (!row) {
            setLoadError('That candidate no longer exists.')
          } else {
            setRequisitionId(row.requisitionId)
            setFullName(row.fullName)
            setPhone(row.phone)
            setEmail(row.email ?? '')
            setPositionApplied(row.positionApplied)
            setSource(row.source)
            setNotes(row.notes ?? '')
          }
        } else {
          const open = await recruitmentService.listOpenRequisitions()
          if (cancelled) return
          setRequisitions(open)
        }
      } catch {
        if (!cancelled) setLoadError('Could not load this page.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [candidateId])

  // Picking a vacancy pre-fills the position — it is the position being hired
  // for, and retyping it is how the two drift apart.
  useEffect(() => {
    if (isEdit || !requisitionId || positionApplied) return
    const match = requisitions.find((row) => row.id === requisitionId)
    if (match) setPositionApplied(match.position)
  }, [requisitionId, requisitions, positionApplied, isEdit])

  const canSubmit = (isEdit || requisitionId !== '') && fullName.trim() !== '' && phone.trim() !== '' && positionApplied.trim() !== ''

  async function handleSave(allowDuplicate = false) {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const base = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        positionApplied: positionApplied.trim(),
        source,
        notes: notes.trim() || null,
      }

      if (candidateId) {
        await recruitmentService.updateCandidate({ ...base, candidateId })
        toast.success('Candidate updated.')
        navigate(`/recruitment/candidates/${candidateId}`)
      } else {
        const { candidateId: newId, candidateNumber } = await recruitmentService.createCandidate({
          ...base,
          requisitionId,
          allowDuplicate,
        })
        toast.success(`${candidateNumber} added to the pipeline.`)
        navigate(`/recruitment/candidates/${newId}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save. Please try again.'
      if (!allowDuplicate && message.includes('phone number already exists')) {
        setDuplicateWarning(message)
      } else {
        toast.error(message)
      }
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
          description="Your role can't add candidates."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to candidates
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
          title="Not found"
          description={loadError}
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to candidates
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit candidate' : 'Add candidate'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Candidates start at Applied. Move them through the pipeline from their own page.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidateRequisition">Vacancy *</Label>
            <Select
              id="candidateRequisition"
              value={requisitionId}
              onChange={(e) => setRequisitionId(e.target.value)}
            >
              <option value="">Select an approved requisition…</option>
              {requisitions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.requisitionNumber} — {row.openings} × {row.position}
                </option>
              ))}
            </Select>
            {requisitions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No approved requisitions yet. A vacancy has to clear approval before candidates can be added.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidateName">Full name *</Label>
            <Input id="candidateName" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidatePhone">Phone *</Label>
            <Input
              id="candidatePhone"
              type="tel"
              value={phone}
              maxLength={40}
              placeholder="+62…"
              onChange={(e) => {
                setPhone(e.target.value)
                setDuplicateWarning(null)
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidateEmail">Email</Label>
            <Input id="candidateEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidatePosition">Position applied *</Label>
            <Input
              id="candidatePosition"
              value={positionApplied}
              maxLength={120}
              onChange={(e) => setPositionApplied(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidateSource">Source *</Label>
            <Select id="candidateSource" value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.entries(CANDIDATE_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="candidateNotes">Notes</Label>
          <Textarea id="candidateNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {duplicateWarning && (
          <div className="rounded-md border border-status-pending bg-sunken p-3 text-sm text-foreground">
            <p>{duplicateWarning}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => handleSave(true)} loading={submitting}>
                Add anyway
              </Button>
              <Button variant="ghost" onClick={() => setDuplicateWarning(null)} disabled={submitting}>
                Go back
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => handleSave()} disabled={!canSubmit} loading={submitting}>
            {isEdit ? 'Save changes' : 'Add candidate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
