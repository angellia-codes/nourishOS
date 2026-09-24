import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { PermissionGuard, EmptyState } from '@/components/shared'
import { TEMPLATE_STATUS_LABELS, TEMPLATE_STATUS_VARIANT } from '../templateStatus'
import { AppraisalTemplateReviewPanel } from '@/features/hr/components/appraisal'
import { useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { useFirestoreDoc } from '@/hooks'
import * as appraisalService from '@/features/hr/services/appraisalService'
import * as positionService from '@/features/hr/positions/positionService'
import type { AppraisalTemplate, Position } from '@/types'

/** §6.2 — the mandatory HR gate: side-by-side generated-criterion / source-responsibility-text review, then Approve. */
export function AppraisalTemplateReviewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { templateId } = useParams<{ templateId: string }>()
  const { data: template, loading, error } = useFirestoreDoc<AppraisalTemplate>(COLLECTIONS.APPRAISAL_TEMPLATES, templateId)
  const [position, setPosition] = useState<Position | null>(null)
  const [approving, setApproving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!template) return
    positionService.getPosition(template.positionId).then(setPosition)
  }, [template?.positionId])

  async function handleApprove() {
    if (!templateId) return
    setApproving(true)
    try {
      const wasStale = template?.templateStatus === 'stale'
      await appraisalService.approveAppraisalTemplate(templateId)
      toast.success(wasStale ? 'Template re-approved. It stays live.' : 'Approved — sent to the GM for sign-off.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve that template.')
    } finally {
      setApproving(false)
    }
  }

  // Archive (2026-09-24) — soft delete, restorable from the Archived templates tab.
  async function handleArchive() {
    if (!templateId || !template) return
    const warning =
      template.templateStatus === 'approved' || template.templateStatus === 'stale'
        ? 'Archive this LIVE template? No new appraisals can be created for this position until another template is approved. Appraisals already in progress are not affected.'
        : 'Archive this template? You can restore it later from the Archived templates tab.'
    if (!window.confirm(warning)) return
    setArchiving(true)
    try {
      await appraisalService.archiveAppraisalTemplate(templateId)
      toast.success('Template archived.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive that template.')
    } finally {
      setArchiving(false)
    }
  }

  async function handleRestore() {
    if (!templateId) return
    setArchiving(true)
    try {
      const { templateStatus } = await appraisalService.restoreAppraisalTemplate(templateId)
      toast.success(`Template restored (${templateStatus}).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore that template.')
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

  if (error || !template) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState title="Template unavailable" description="That template may have been removed." />
      </div>
    )
  }

  const canApprove = template.templateStatus === 'draft' || template.templateStatus === 'stale'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/hr/appraisal-templates')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Templates
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">v{template.version}</Badge>
            <Badge variant={TEMPLATE_STATUS_VARIANT[template.templateStatus]}>
              {TEMPLATE_STATUS_LABELS[template.templateStatus]}
            </Badge>
            <Badge variant="neutral">{template.generationMethod}</Badge>
          </div>
          <CardTitle>{position?.title.en ?? template.positionId}</CardTitle>
        </CardHeader>
        {template.templateStatus === 'pendingGm' && (
          <CardContent className="text-sm text-muted-foreground">
            HR-approved. Waiting for the GM to approve it from the dashboard's Pending Approvals before it goes live.
          </CardContent>
        )}
        {template.templateStatus !== 'pendingGm' && (
          <CardContent className="flex flex-wrap justify-end gap-2">
            <PermissionGuard permission={PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE}>
              {template.templateStatus === 'archived' ? (
                <Button variant="secondary" disabled={archiving} onClick={() => void handleRestore()}>
                  {archiving ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                      Restore
                    </>
                  )}
                </Button>
              ) : (
                <Button variant="secondary" disabled={archiving} onClick={() => void handleArchive()}>
                  {archiving ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <>
                      <Archive className="mr-1 h-4 w-4" aria-hidden="true" />
                      Archive
                    </>
                  )}
                </Button>
              )}
            </PermissionGuard>
            {canApprove && (
              <PermissionGuard permission={PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE}>
                <Button disabled={approving} onClick={() => void handleApprove()}>
                  {approving ? <Spinner className="h-4 w-4" /> : <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{template.templateStatus === 'stale' ? 'Re-approve' : 'Approve & send to GM'}</>}
                </Button>
              </PermissionGuard>
            )}
          </CardContent>
        )}
      </Card>

      <AppraisalTemplateReviewPanel
        criteria={template.criteria}
        responsibilities={position?.keyResponsibilities.filter((r) => !r.isRemoved) ?? []}
      />
    </div>
  )
}
