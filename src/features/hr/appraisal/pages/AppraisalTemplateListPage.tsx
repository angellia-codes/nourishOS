import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Sparkles } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { useToast } from '@/hooks'
import { PERMISSIONS } from '@/constants'
import * as appraisalService from '@/features/hr/services/appraisalService'
import * as positionService from '@/features/hr/positions/positionService'
import type { AppraisalTemplate, Position } from '@/types'

const STATUS_VARIANT: Record<AppraisalTemplate['templateStatus'], 'success' | 'warning' | 'neutral'> = {
  approved: 'success',
  draft: 'warning',
  stale: 'warning',
  archived: 'neutral',
}

/** §6 — one row per position: its latest template's status, and a Generate action when appraisable with no approved instrument yet. */
export function AppraisalTemplateListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [positions, setPositions] = useState<Position[] | null>(null)
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([])
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    positionService.listPositions().then(setPositions)
    appraisalService.listAppraisalTemplates().then(setTemplates)
  }, [])

  async function handleGenerate(positionId: string) {
    setGeneratingId(positionId)
    try {
      const { templateId } = await appraisalService.generateAppraisalTemplate(positionId)
      toast.success('Template drafted — review before approving.')
      navigate(`/hr/appraisal-templates/${templateId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate a template.')
    } finally {
      setGeneratingId(null)
    }
  }

  if (positions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const appraisable = positions.filter((p) => p.isAppraisable && p.isActive)
  const latestByPosition = new Map<string, AppraisalTemplate>()
  for (const t of templates) {
    const existing = latestByPosition.get(t.positionId)
    if (!existing || t.version > existing.version) latestByPosition.set(t.positionId, t)
  }

  if (appraisable.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<ClipboardCheck className="h-8 w-8" aria-hidden="true" />}
          title="No appraisable positions yet"
          description="Seed or create positions in Positions Master first."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Appraisal Templates</h1>
        <p className="text-sm text-muted-foreground">One instrument per position, generated from Key Responsibilities.</p>
      </div>

      <div className="flex flex-col gap-2">
        {appraisable.map((position) => {
          const latest = latestByPosition.get(position.positionId)
          return (
            <Card key={position.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{position.title.en}</p>
                  {latest ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/hr/appraisal-templates/${latest.id}`)}
                      className="mt-1 text-xs text-muted-foreground hover:underline"
                    >
                      v{latest.version}
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No template yet</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {latest && <Badge variant={STATUS_VARIANT[latest.templateStatus]}>{latest.templateStatus}</Badge>}
                  <PermissionGuard permission={PERMISSIONS.APPRAISAL_TEMPLATES_GENERATE}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={generatingId === position.positionId || position.keyResponsibilities.length === 0}
                      onClick={() => void handleGenerate(position.positionId)}
                    >
                      {generatingId === position.positionId ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
                          {latest ? 'Regenerate' : 'Generate'}
                        </>
                      )}
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
