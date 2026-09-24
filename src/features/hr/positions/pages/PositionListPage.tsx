import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner, Tabs } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { useToast } from '@/hooks'
import * as positionService from '../positionService'
import { positionStatusVariant, isScorerUnassigned } from '../positionFormat'
import { POSITION_LEVEL_LABELS, type Position } from '@/types'

type View = 'active' | 'archived'

/**
 * POSITIONS_MASTER_DESIGN.md — the org-wide Job Description catalogue.
 * Archived tab (2026-09-24): archived positions were previously invisible
 * with no way back; superAdmin/HR Manager can now see and restore them.
 */
export function PositionListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [positions, setPositions] = useState<Position[] | null>(null)
  const [view, setView] = useState<View>('active')
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    positionService.listPositions().then(setPositions)
  }, [])

  async function handleRestore(positionId: string) {
    setRestoringId(positionId)
    try {
      await positionService.restorePosition(positionId)
      toast.success('Position restored. Its appraisal templates stay archived until you restore one.')
      setPositions(await positionService.listPositions())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore that position.')
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

  const active = positions.filter((p) => p.isActive)
  const archived = positions.filter((p) => !p.isActive)
  const shown = view === 'active' ? active : archived

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Positions</h1>
          <p className="text-sm text-muted-foreground">Job descriptions, tiers and appraisal scorers.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.POSITIONS_CREATE}>
          <Button onClick={() => navigate('/positions/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Position
          </Button>
        </PermissionGuard>
      </div>

      <Tabs
        items={[
          { value: 'active', label: `Active (${active.length})` },
          { value: 'archived', label: `Archived (${archived.length})` },
        ]}
        value={view}
        onValueChange={(value) => setView(value as View)}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8" aria-hidden="true" />}
          title={view === 'active' ? 'No positions yet' : 'No archived positions'}
          description={
            view === 'active' ? 'Seed the catalog or add a position to get started.' : 'Archived positions appear here.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((position) => (
            <Card key={position.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => navigate(`/positions/${position.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-foreground">{position.title.en}</p>
                  <p className="text-xs text-muted-foreground">
                    {POSITION_LEVEL_LABELS[position.level]} · {position.departmentId}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  {view === 'active' ? (
                    <>
                      {isScorerUnassigned(position) && <Badge variant="warning">Scorer Unassigned</Badge>}
                      <Badge variant={positionStatusVariant(position.positionStatus)}>{position.positionStatus}</Badge>
                    </>
                  ) : (
                    <PermissionGuard permission={PERMISSIONS.POSITIONS_ARCHIVE}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={restoringId === position.id}
                        onClick={() => void handleRestore(position.id)}
                      >
                        {restoringId === position.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <>
                            <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                            Restore
                          </>
                        )}
                      </Button>
                    </PermissionGuard>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
