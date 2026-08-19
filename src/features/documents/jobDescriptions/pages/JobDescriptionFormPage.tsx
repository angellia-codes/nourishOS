import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { DEPARTMENTS, DEPARTMENT_ROLES, ROLES, ROLE_LABELS } from '@/constants'
import { useRole, useToast } from '@/hooks'
import * as jobDescriptionService from '../jobDescriptionService'
import type { Role } from '@/constants/roles'

const LIST_ROUTE = '/documents/job-descriptions'

/**
 * Add / edit / delete a job description — documents.md §5. One component for
 * both routes, the same way EmployeeFormPage serves employees/new and
 * employees/:id/edit.
 *
 * Department narrows Role via DEPARTMENT_ROLES, the same chain RegisterPage
 * uses, and the callable re-validates the pair server-side. Delete is a
 * two-step inline confirm because this design system has no Dialog primitive.
 */
export function JobDescriptionFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { jobDescriptionId } = useParams<{ jobDescriptionId: string }>()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)
  const isEdit = Boolean(jobDescriptionId)

  const [departmentId, setDepartmentId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [title, setTitle] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobDescriptionId) return
    let cancelled = false

    jobDescriptionService
      .getJobDescription(jobDescriptionId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setLoadError('That job description no longer exists.')
        } else {
          setDepartmentId(row.departmentId)
          setRoleId(row.roleId)
          setTitle(row.title)
          setPdfUrl(row.pdfUrl)
          setNotes(row.notes ?? '')
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load that job description.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [jobDescriptionId])

  const roleOptions = DEPARTMENT_ROLES[departmentId] ?? []
  const canSubmit =
    departmentId !== '' && roleId !== '' && title.trim() !== '' && pdfUrl.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const input = {
        departmentId,
        roleId: roleId as Role,
        title: title.trim(),
        pdfUrl: pdfUrl.trim(),
        notes: notes.trim() || null,
      }

      if (jobDescriptionId) {
        await jobDescriptionService.updateJobDescription({ ...input, jobDescriptionId })
        toast.success('Job description updated.')
      } else {
        await jobDescriptionService.createJobDescription(input)
        toast.success('Job description added.')
      }
      navigate(LIST_ROUTE)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!jobDescriptionId) return
    setSubmitting(true)
    try {
      await jobDescriptionService.deleteJobDescription(jobDescriptionId)
      toast.success('Job description deleted.')
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
          description="Only a super admin can add or edit job descriptions."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to Job Descriptions
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
              Back to Job Descriptions
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Job Description' : 'Add Job Description'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Link to the PDF wherever it already lives — Drive, Dropbox, or any https link. Nothing is uploaded here.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jdDepartment">Department *</Label>
          <Select
            id="jdDepartment"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value)
              setRoleId('')
            }}
          >
            <option value="">Select a department…</option>
            {DEPARTMENTS.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jdRole">Role *</Label>
          <Select
            id="jdRole"
            value={roleId}
            disabled={departmentId === ''}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">{departmentId === '' ? 'Select a department first' : 'Select a role…'}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jdTitle">Title *</Label>
          <Input
            id="jdTitle"
            value={title}
            maxLength={160}
            placeholder="e.g. Kitchen Leader — Job Description"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jdPdfUrl">PDF link *</Label>
          <Input
            id="jdPdfUrl"
            type="url"
            value={pdfUrl}
            placeholder="https://drive.google.com/file/d/…"
            onChange={(e) => setPdfUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Must start with http:// or https://.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jdNotes">Notes</Label>
          <Textarea
            id="jdNotes"
            value={notes}
            maxLength={500}
            rows={3}
            placeholder="Optional — revision date, who owns it, anything worth saying next to the link."
            onChange={(e) => setNotes(e.target.value)}
          />
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
              {isEdit ? 'Save changes' : 'Add job description'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
