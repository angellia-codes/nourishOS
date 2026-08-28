import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { PermissionGuard, EmptyState } from '@/components/shared'
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

  useEffect(() => {
    if (!template) return
    positionService.getPosition(template.positionId).then(setPosition)
  }, [template?.positionId])

  async function handleApprove() {
    if (!templateId) return
    setApproving(true)
    try {
      await appraisalService.approveAppraisalTemplate(templateId)
      toast.success('Template approved. It is now live for new appraisals.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve that template.')
    } finally {
      setApproving(false)
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
            <Badge variant={template.templateStatus === 'approved' ? 'success' : 'warning'}>
              {template.templateStatus}
            </Badge>
            <Badge variant="neutral">{template.generationMethod}</Badge>
          </div>
          <CardTitle>{position?.title.en ?? template.positionId}</CardTitle>
        </CardHeader>
        {canApprove && (
          <CardContent className="flex justify-end">
            <PermissionGuard permission={PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE}>
              <Button disabled={approving} onClick={() => void handleApprove()}>
                {approving ? <Spinner className="h-4 w-4" /> : <><Check className="mr-1 h-4 w-4" aria-hidden="true" />Approve</>}
              </Button>
            </PermissionGuard>
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
