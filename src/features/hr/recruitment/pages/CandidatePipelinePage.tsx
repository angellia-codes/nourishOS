import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Plus } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import {
  ACTIVE_STAGES,
  CANDIDATE_STAGE_ICON,
  CANDIDATE_STAGE_TONE,
  CLOSED_STAGES,
  daysInStage,
} from '../recruitmentFormat'
import { CANDIDATE_STAGE_LABELS, type Candidate, type CandidateStage } from '@/types'

/**
 * The pipeline board — HR_OPERATIONS.md 9.4-F03. One column per active stage,
 * scrolling horizontally rather than squeezing six columns onto a phone.
 *
 * Stage moves happen on the candidate's own page, not by dragging: a hire needs
 * a join date and a rejection wants a reason, so every move is a small form
 * rather than a drop target. That also keeps a drag-and-drop dependency out of
 * the bundle for a board most people will read more often than they rearrange.
 */
export function CandidatePipelinePage() {
  const navigate = useNavigate()
  const { can } = usePermissions()

  const [rows, setRows] = useState<Candidate[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [showClosed, setShowClosed] = useState(false)

  useEffect(() => {
    return recruitmentService.subscribeToCandidates(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [])

  const byStage = useMemo(() => {
    const groups = new Map<CandidateStage, Candidate[]>()
    for (const candidate of rows ?? []) {
      const existing = groups.get(candidate.currentStage)
      if (existing) existing.push(candidate)
      else groups.set(candidate.currentStage, [candidate])
    }
    return groups
  }, [rows])

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Candidate records are limited to HR and above."
        />
      </div>
    )
  }

  const stages = showClosed ? [...ACTIVE_STAGES, ...CLOSED_STAGES] : ACTIVE_STAGES
  const activeCount = rows.filter((row) => ACTIVE_STAGES.includes(row.currentStage)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} in the pipeline · {rows.length - activeCount} closed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowClosed((current) => !current)}>
            {showClosed ? 'Hide closed' : 'Show rejected & withdrawn'}
          </Button>
          {can(PERMISSIONS.RECRUITMENT_CREATE) && (
            <Button onClick={() => navigate('/hr/candidates/new')}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add candidate
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          description="Candidates are added against an approved requisition — start from Requisitions if there isn't an open vacancy yet."
        />
      ) : (
        // The board itself scrolls, not the page: horizontal page scroll makes
        // every other element on screen drift too.
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-3">
            {stages.map((stage) => {
              const column = byStage.get(stage) ?? []
              return (
                <section key={stage} className="flex w-64 shrink-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill
                      tone={CANDIDATE_STAGE_TONE[stage]}
                      icon={CANDIDATE_STAGE_ICON[stage]}
                      label={CANDIDATE_STAGE_LABELS[stage]}
                    />
                    <span className="text-xs text-muted-foreground">{column.length}</span>
                  </div>

                  {column.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                      Empty
                    </p>
                  ) : (
                    column.map((candidate) => (
                      <Card
                        key={candidate.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/hr/candidates/${candidate.id}`)}
                      >
                        <CardContent className="flex flex-col gap-1 p-3">
                          <p className="font-mono text-[11px] text-muted-foreground">{candidate.candidateNumber}</p>
                          <p className="truncate text-sm font-medium text-foreground">{candidate.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{candidate.positionApplied}</p>
                          <p className="text-xs text-muted-foreground">
                            {daysInStage(candidate.stageChangedAt)} day
                            {daysInStage(candidate.stageChangedAt) === 1 ? '' : 's'} in stage
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
