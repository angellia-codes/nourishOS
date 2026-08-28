import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as positionService from '../positionService'
import { positionStatusVariant, isScorerUnassigned } from '../positionFormat'
import { POSITION_LEVEL_LABELS, type Position } from '@/types'

/** POSITIONS_MASTER_DESIGN.md — the org-wide Job Description catalogue. */
export function PositionListPage() {
  const navigate = useNavigate()
  const [positions, setPositions] = useState<Position[] | null>(null)

  useEffect(() => {
    positionService.listPositions().then(setPositions)
  }, [])

  if (positions === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const active = positions.filter((p) => p.isActive)

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

      {active.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8" aria-hidden="true" />}
          title="No positions yet"
          description="Seed the catalog or add a position to get started."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((position) => (
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
                  {isScorerUnassigned(position) && <Badge variant="warning">Scorer Unassigned</Badge>}
                  <Badge variant={positionStatusVariant(position.positionStatus)}>{position.positionStatus}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
