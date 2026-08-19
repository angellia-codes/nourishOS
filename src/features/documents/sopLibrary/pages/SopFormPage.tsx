import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, ROLES } from '@/constants'
import { useRole, useToast } from '@/hooks'
import * as sopService from '../sopService'

const LIST_ROUTE = '/documents/sop-library'

/**
 * Add / edit / delete an SOP — documents.md §6. One component for both routes,
 * the same way JobDescriptionFormPage serves new and :id/edit.
 *
 * Delete is a two-step inline confirm because this design system has no Dialog
 * primitive.
 */
export function SopFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { sopId } = useParams<{ sopId: string }>()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)
  const isEdit = Boolean(sopId)

  const [departmentId, setDepartmentId] = useState('')
  const [sopNumber, setSopNumber] = useState('')
  const [topic, setTopic] = useState('')
  const [driveUrl, setDriveUrl] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!sopId) return
    let cancelled = false

    sopService
      .getSop(sopId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setLoadError('That SOP no longer exists.')
        } else {
          setDepartmentId(row.departmentId)
          setSopNumber(row.sopNumber)
          setTopic(row.topic)
          setDriveUrl(row.driveUrl)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load that SOP.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sopId])

  const canSubmit =
    departmentId !== '' && sopNumber.trim() !== '' && topic.trim() !== '' && driveUrl.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const input = {
        departmentId,
        sopNumber: sopNumber.trim(),
        topic: topic.trim(),
        driveUrl: driveUrl.trim(),
      }

      if (sopId) {
        await sopService.updateSop({ ...input, sopId })
        toast.success('SOP updated.')
      } else {
        await sopService.createSop(input)
        toast.success('SOP added.')
      }
      navigate(LIST_ROUTE)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!sopId) return
    setSubmitting(true)
    try {
      await sopService.deleteSop(sopId)
      toast.success('SOP deleted.')
      navigate(LIST_ROUTE)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete. Please try again.')
      setSubmitting(false)
    }
  }

  // The callable rejects a non-superAdmin regardless; this only saves them a
  // round trip and a form they can't submit.
  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Super admin only"
          description="Only a super admin can add or edit SOPs."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to SOP Library
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
              Back to SOP Library
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit SOP' : 'Add SOP'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Link to the SOP wherever it already lives — Google Drive or any https link. Nothing is uploaded here.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sopDepartment">Department *</Label>
          <Select id="sopDepartment" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select a department…</option>
            {DEPARTMENTS.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sopNumber">SOP number *</Label>
          <Input
            id="sopNumber"
            value={sopNumber}
            maxLength={40}
            placeholder="e.g. SOP-KIT-001"
            onChange={(e) => setSopNumber(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sopTopic">SOP topic *</Label>
          <Input
            id="sopTopic"
            value={topic}
            maxLength={160}
            placeholder="e.g. Opening & Closing Checklist"
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sopDriveUrl">Google Drive link *</Label>
          <Input
            id="sopDriveUrl"
            type="url"
            value={driveUrl}
            placeholder="https://drive.google.com/file/d/…"
            onChange={(e) => setDriveUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Must start with http:// or https://.</p>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          {isEdit ? (
            confirmingDelete ? (
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleDelete} loading={submitting}>
                  Confirm delete
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={submitting}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmingDelete(true)} disabled={submitting}>
                Delete
              </Button>
            )
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
              {isEdit ? 'Save changes' : 'Add SOP'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
