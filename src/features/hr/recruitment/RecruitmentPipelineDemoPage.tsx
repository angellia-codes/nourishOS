import { useNavigate } from 'react-router-dom'
import { Plus, Timer, TrendingUp, UserCheck, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import {
  MOCK_CANDIDATES,
  REQUISITION_OUTLETS,
} from './candidatePipelineDemoData'
import { CANDIDATE_STAGES, CANDIDATE_STAGE_VARIANT } from './candidatePipelineFormat'

function outletName(outletId: string): string {
  return REQUISITION_OUTLETS.find((o) => o.id === outletId)?.name ?? outletId
}

/**
 * Read-only visual preview of the Recruitment Pipeline Kanban board —
 * HR_OPERATIONS.md §9.4 (all 8 ST-01..ST-08 columns, 9.4-F03) and 9.4-F08
 * (funnel metrics). Mock data, no Firestore subscription, no backend calls.
 */
export function RecruitmentPipelineDemoPage() {
  const navigate = useNavigate()

  const hiredCandidates = MOCK_CANDIDATES.filter((c) => c.currentStage === 'ST-06')
  const rejectedCount = MOCK_CANDIDATES.filter((c) => c.currentStage === 'ST-07').length
  const avgDaysToHire = hiredCandidates.length
    ? Math.round(hiredCandidates.reduce((sum, c) => sum + (c.totalDaysToHire ?? 0), 0) / hiredCandidates.length)
    : 0

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-6xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /hr/pipeline.
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Recruitment Pipeline</h1>
            <p className="text-sm text-muted-foreground">Candidate Kanban board — Applied through Hired/Rejected/Withdrawn.</p>
          </div>
          <Button onClick={() => navigate('/demo/hr/pipeline/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add Candidate
          </Button>
        </div>

        {/* Hiring metrics — HR_OPERATIONS.md 9.4-F08 funnel view */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{MOCK_CANDIDATES.length} candidates in pipeline</p>
                <p className="text-xs text-muted-foreground">Across all outlets</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{hiredCandidates.length} hired &middot; {rejectedCount} rejected</p>
                <p className="text-xs text-muted-foreground">Outcome split</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Timer className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{avgDaysToHire || '—'} days avg. time-to-hire</p>
                <p className="text-xs text-muted-foreground">Application to join date</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban board */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {CANDIDATE_STAGES.map((stage) => {
            const candidates = MOCK_CANDIDATES.filter((c) => c.currentStage === stage.code)
            return (
              <div key={stage.code} className="flex w-64 shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-foreground">{stage.label}</p>
                  <Badge variant={CANDIDATE_STAGE_VARIANT[stage.code]}>{candidates.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {candidates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No candidates
                    </div>
                  ) : (
                    candidates.map((candidate) => (
                      <Card
                        key={candidate.id}
                        className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                        onClick={() => navigate(`/demo/hr/pipeline/${candidate.id}`)}
                      >
                        <CardContent className="flex flex-col gap-1.5 p-3">
                          <p className="text-sm font-medium text-foreground">{candidate.fullName}</p>
                          <p className="text-xs text-muted-foreground">{candidate.positionApplied}</p>
                          <p className="text-xs text-muted-foreground">{outletName(candidate.outletId)}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Day {candidate.daysInCurrentStage}</span>
                            {candidate.hrInterviewScore !== undefined && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                {candidate.hrInterviewScore}/5
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
