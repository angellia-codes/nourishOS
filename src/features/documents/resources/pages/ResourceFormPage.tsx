import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import * as documentResourceService from '../documentResourceService'
import type { DocumentResourceKind } from '../documentResourceService'

interface ResourceFormPageProps {
  kind: DocumentResourceKind
  title: string
  basePath: string
  paramName: string
}

/** Add/edit a Company Form or Template — one component for both routes, same precedent as SopFormPage. */
export function ResourceFormPage({ kind, title, basePath, paramName }: ResourceFormPageProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const params = useParams()
  const resourceId = params[paramName]
  const isEdit = Boolean(resourceId)

  const [resourceTitle, setResourceTitle] = useState('')
  const [category, setCategory] = useState('')
  const [driveUrl, setDriveUrl] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!resourceId) return
    let cancelled = false
    documentResourceService
      .getDocumentResource(kind, resourceId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setLoadError('That item no longer exists.')
        } else {
          setResourceTitle(row.title)
          setCategory(row.category)
          setDriveUrl(row.driveUrl)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load that item.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, resourceId])

  const canSubmit = resourceTitle.trim() !== '' && driveUrl.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const input = { title: resourceTitle.trim(), category: category.trim(), driveUrl: driveUrl.trim() }
      if (resourceId) {
        await documentResourceService.updateDocumentResource(kind, resourceId, input)
        toast.success('Updated.')
      } else {
        await documentResourceService.createDocumentResource(kind, input)
        toast.success('Added.')
      }
      navigate(basePath)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!resourceId) return
    setSubmitting(true)
    try {
      await documentResourceService.deleteDocumentResource(kind, resourceId)
      toast.success('Deleted.')
      navigate(basePath)
    } catch {
      toast.error('Failed to delete. Please try again.')
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

  if (loadError) {
    return (
      <EmptyState
        title={loadError}
        action={
          <Button type="button" variant="secondary" onClick={() => navigate(basePath)}>
            Back
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        {isEdit ? 'Edit' : 'Add'} {title}
      </h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-title">Title *</Label>
            <Input id="resource-title" value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-category">Category</Label>
            <Input id="resource-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-url">Link *</Label>
            <Input
              id="resource-url"
              placeholder="https://…"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            {isEdit && (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Delete this?</span>
                  <Button type="button" variant="danger" disabled={submitting} onClick={handleDelete}>
                    Confirm
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              )
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(basePath)}>
                Cancel
              </Button>
              <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? <Spinner className="h-4 w-4" /> : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
