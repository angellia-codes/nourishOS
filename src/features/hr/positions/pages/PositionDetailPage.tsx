import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { useFirestoreDoc, useToast } from '@/hooks'
import { POSITION_LEVEL_LABELS, type Position } from '@/types'
import * as positionService from '../positionService'
import { positionStatusVariant, isScorerUnassigned } from '../positionFormat'

/** Read view of one position's JD content, tier, and appraisal scorer assignment. */
export function PositionDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { positionId } = useParams<{ positionId: string }>()

  const { data: position, loading, error } = useFirestoreDoc<Position>(COLLECTIONS.POSITIONS, positionId)
  const [allPositions, setAllPositions] = useState<Position[]>([])
  const [scorerDraft, setScorerDraft] = useState<string>('')
  const [savingScorer, setSavingScorer] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    positionService.listPositions().then(setAllPositions)
  }, [])

  useEffect(() => {
    setScorerDraft(position?.appraisalScorerPositionId ?? '')
  }, [position?.appraisalScorerPositionId])

  async function handleSetScorer() {
    if (!positionId) return
    setSavingScorer(true)
    try {
      await positionService.setAppraisalScorer(positionId, scorerDraft || null)
      toast.success('Appraisal scorer updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the scorer.')
    } finally {
      setSavingScorer(false)
    }
  }

  async function handleArchive() {
    if (!positionId) return
    setArchiving(true)
    try {
      await positionService.archivePosition(positionId)
      toast.success('Position archived.')
      navigate('/positions')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive that position.')
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

  if (error || !position || !positionId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Position unavailable"
          description="That position may have been removed."
        />
      </div>
    )
  }

  const activeResponsibilities = position.keyResponsibilities.filter((r) => !r.isRemoved)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/positions')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Positions
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{POSITION_LEVEL_LABELS[position.level]}</Badge>
            <Badge variant="neutral">{position.departmentId}</Badge>
            <Badge variant={positionStatusVariant(position.positionStatus)}>{position.positionStatus}</Badge>
            {!position.isAppraisable && <Badge variant="neutral">Not appraisable</Badge>}
            {isScorerUnassigned(position) && <Badge variant="warning">Scorer Unassigned</Badge>}
          </div>
          <CardTitle>{position.title.en}</CardTitle>
          {position.jobOverview.en && <p className="text-sm text-muted-foreground">{position.jobOverview.en}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap justify-end gap-2">
          <PermissionGuard permission={PERMISSIONS.POSITIONS_UPDATE}>
            <Button variant="secondary" onClick={() => navigate(`/positions/${positionId}/edit`)}>
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.POSITIONS_ARCHIVE}>
            <Button variant="secondary" disabled={archiving} onClick={() => void handleArchive()}>
              {archiving ? <Spinner className="h-4 w-4" /> : 'Archive'}
            </Button>
          </PermissionGuard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {activeResponsibilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No key responsibilities recorded yet — this position is still a draft JD.
            </p>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
              {activeResponsibilities
                .sort((a, b) => a.order - b.order)
                .map((r) => (
                  <li key={r.responsibilityId}>{r.text.en}</li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <PermissionGuard permission={PERMISSIONS.POSITIONS_SET_SCORER}>
        <Card>
          <CardHeader>
            <CardTitle>Appraisal Scorer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Select value={scorerDraft} onChange={(e) => setScorerDraft(e.target.value)}>
                <option value="">Unassigned</option>
                {allPositions
                  .filter((p) => p.positionId !== position.positionId)
                  .map((p) => (
                    <option key={p.positionId} value={p.positionId}>
                      {p.title.en}
                    </option>
                  ))}
              </Select>
            </div>
            <Button disabled={savingScorer} onClick={() => void handleSetScorer()}>
              {savingScorer ? <Spinner className="h-4 w-4" /> : 'Save'}
            </Button>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  )
}
