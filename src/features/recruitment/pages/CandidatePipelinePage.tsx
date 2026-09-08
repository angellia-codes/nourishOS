import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
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
  const toast = useToast()
  const { can } = usePermissions()

  const [rows, setRows] = useState<Candidate[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [deletingRejected, setDeletingRejected] = useState(false)

  const canDelete = can(PERMISSIONS.RECRUITMENT_DELETE)

  /**
   * One click, N calls to the same deleteCandidate callable the candidate
   * detail page uses — no new backend endpoint, since the callable already
   * enforces the ST-07-only + permission rules per candidate. A partial
   * failure (a candidate someone else just moved out of Rejected mid-loop)
   * is reported rather than silently swallowed; the live subscription below
   * reflects whatever actually got deleted either way.
   */
  async function handleDeleteAllRejected(candidates: Candidate[]) {
    if (
      !window.confirm(
        `Delete all ${candidates.length} rejected candidate${candidates.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return
    }
    setDeletingRejected(true)
    let failed = 0
    for (const candidate of candidates) {
      try {
        await recruitmentService.deleteCandidate(candidate.id)
      } catch {
        failed += 1
      }
    }
    setDeletingRejected(false)
    if (failed > 0) {
      toast.error(`${failed} of ${candidates.length} candidates could not be deleted.`)
    } else {
      toast.success(`${candidates.length} rejected candidate${candidates.length === 1 ? '' : 's'} deleted.`)
    }
  }

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
            <Button onClick={() => navigate('/recruitment/candidates/new')}>
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{column.length}</span>
                      {stage === 'ST-07' && canDelete && column.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5"
                          disabled={deletingRejected}
                          onClick={() => handleDeleteAllRejected(column)}
                          aria-label="Delete all rejected candidates"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
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
                        onClick={() => navigate(`/recruitment/candidates/${candidate.id}`)}
                      >
                        <CardContent className="flex flex-col gap-1 p-3">
                          <p className="font-mono text-[11px] text-muted-foreground">{candidate.candidateNumber}</p>
                          <p className="truncate text-sm font-medium text-foreground">{candidate.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{candidate.positionApplied}</p>
                          {(candidate.discSummary || candidate.appliedVia === 'portal') && (
                            <p className="flex gap-1 text-[11px] text-muted-foreground">
                              {candidate.appliedVia === 'portal' && (
                                <span className="rounded bg-sunken px-1.5 py-0.5">Portal</span>
                              )}
                              {candidate.discSummary && (
                                <span className="rounded bg-sunken px-1.5 py-0.5 font-mono">
                                  DISC {candidate.discSummary}
                                </span>
                              )}
                            </p>
                          )}
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
