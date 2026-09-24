import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, RotateCcw, Sparkles } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner, Tabs } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { useToast } from '@/hooks'
import { PERMISSIONS } from '@/constants'
import * as appraisalService from '@/features/hr/services/appraisalService'
import * as positionService from '@/features/hr/positions/positionService'
import type { AppraisalTemplate, Position } from '@/types'
import { TEMPLATE_STATUS_LABELS, TEMPLATE_STATUS_VARIANT } from '../templateStatus'


type View = 'current' | 'archived'

/** §6 — one row per position: its latest template's status, and a Generate action when appraisable with no approved instrument yet. */
export function AppraisalTemplateListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [positions, setPositions] = useState<Position[] | null>(null)
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([])
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [view, setView] = useState<View>('current')
  const [restoringId, setRestoringId] = useState<string | null>(null)

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

  // Archive (2026-09-24) — restore puts the template back in the status it was archived from.
  async function handleRestore(templateId: string) {
    setRestoringId(templateId)
    try {
      const { templateStatus } = await appraisalService.restoreAppraisalTemplate(templateId)
      toast.success(`Template restored (${templateStatus}).`)
      setTemplates(await appraisalService.listAppraisalTemplates())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore that template.')
    } finally {
      setRestoringId(null)
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
    // An archived version is never "the" template for its position — with the
    // live one archived, the row falls back to Generate.
    if (t.templateStatus === 'archived') continue
    const existing = latestByPosition.get(t.positionId)
    if (!existing || t.version > existing.version) latestByPosition.set(t.positionId, t)
  }

  const titleByPositionId = new Map(positions.map((p) => [p.positionId, p.title.en]))
  const archivedTemplates = templates
    .filter((t) => t.templateStatus === 'archived')
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  if (appraisable.length === 0 && archivedTemplates.length === 0) {
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

      <Tabs
        items={[
          { value: 'current', label: 'Positions' },
          { value: 'archived', label: `Archived templates (${archivedTemplates.length})` },
        ]}
        value={view}
        onValueChange={(value) => setView(value as View)}
      />

      {view === 'archived' && (
        <div className="flex flex-col gap-2">
          {archivedTemplates.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-8 w-8" aria-hidden="true" />}
              title="No archived templates"
              description="Archived templates appear here and can be restored."
            />
          ) : (
            archivedTemplates.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/hr/appraisal-templates/${t.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-medium text-foreground">{titleByPositionId.get(t.positionId) ?? t.positionId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      v{t.version} · was {t.archivedFromStatus ?? 'draft'}
                      {t.archivedAt ? ` · archived ${t.archivedAt.slice(0, 10)}` : ''}
                    </p>
                  </button>
                  <PermissionGuard permission={PERMISSIONS.APPRAISAL_TEMPLATES_APPROVE}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={restoringId === t.id}
                      onClick={() => void handleRestore(t.id)}
                    >
                      {restoringId === t.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <>
                          <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                          Restore
                        </>
                      )}
                    </Button>
                  </PermissionGuard>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {view === 'current' && (
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
                    {latest && <Badge variant={TEMPLATE_STATUS_VARIANT[latest.templateStatus]}>{TEMPLATE_STATUS_LABELS[latest.templateStatus]}</Badge>}
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
      )}
    </div>
  )
}
