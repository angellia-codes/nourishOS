import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import {
  CANDIDATE_SOURCE_LABELS,
  CANDIDATE_STAGE_ICON,
  CANDIDATE_STAGE_TONE,
  daysInStage,
  timeToHireDays,
  formatDateTime,
} from '../recruitmentFormat'
import {
  CANDIDATE_STAGE_LABELS,
  SCORECARD_CRITERIA,
  SCORECARD_CRITERION_LABELS,
  type ApplicationFormSensitive,
  type Candidate,
  type CandidateStage,
  type DiscResult,
  type FileMetadata,
  type Interview,
  type InterviewRecommendation,
  type ScorecardCriterion,
} from '@/types'
import { ApplicationFormPanel } from '../components/ApplicationFormPanel'
import { CandidateDocumentsPanel } from '../components/CandidateDocumentsPanel'
import { DiscPanel } from '../components/DiscPanel'

const LIST_ROUTE = '/recruitment/candidates'

/**
 * Which stages a candidate can move to from here — mirrors
 * ALLOWED_STAGE_TRANSITIONS in functions/src/hr/recruitment/helpers.ts. Kept in
 * sync by hand (the same frontend/functions duplication as collections and
 * permissions); the server is the one that enforces it.
 */
const NEXT_STAGES: Record<CandidateStage, CandidateStage[]> = {
  'ST-01': ['ST-02', 'ST-07', 'ST-08'],
  'ST-02': ['ST-03', 'ST-07', 'ST-08'],
  'ST-03': ['ST-04', 'ST-05', 'ST-07', 'ST-08'],
  'ST-04': ['ST-05', 'ST-07', 'ST-08'],
  'ST-05': ['ST-06', 'ST-07', 'ST-08'],
  'ST-06': [],
  'ST-07': [],
  'ST-08': [],
}

const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  proceed: 'Proceed',
  hold: 'Hold',
  reject: 'Reject',
}

/** All six default to 3 so "no opinion" is the middle of the scale, not a blank. */
const BLANK_SCORECARD = Object.fromEntries(SCORECARD_CRITERIA.map((key) => [key, 3])) as Record<
  ScorecardCriterion,
  number
>

const OUTCOME_LABELS: Record<string, string> = {
  pending: 'Awaiting outcome',
  pass: 'Pass',
  fail: 'Fail',
  noShow: 'No show',
}

export function CandidateDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { candidateId } = useParams<{ candidateId: string }>()

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [disc, setDisc] = useState<DiscResult | null>(null)
  const [sensitive, setSensitive] = useState<ApplicationFormSensitive | null>(null)
  const [documents, setDocuments] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [targetStage, setTargetStage] = useState('')
  const [joinDate, setJoinDate] = useState('')
  const [stageReason, setStageReason] = useState('')

  const [scoringId, setScoringId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'pass' | 'fail' | 'noShow'>('pass')
  const [scorecard, setScorecard] = useState<Record<ScorecardCriterion, number>>(BLANK_SCORECARD)
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>('proceed')
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [interviewNotes, setInterviewNotes] = useState('')

  const load = useCallback(async () => {
    if (!candidateId) return
    const row = await recruitmentService.getCandidate(candidateId)
    setCandidate(row)
    if (row) {
      // Four independent reads; the DISC and confidential ones resolve to null
      // rather than throwing when the caller's role cannot see them.
      const [rows, discResult, confidential, files] = await Promise.all([
        recruitmentService.listInterviewsForCandidate(candidateId),
        recruitmentService.getDiscResult(candidateId),
        recruitmentService.getCandidateSensitive(candidateId),
        recruitmentService.listCandidateDocuments(candidateId),
      ])
      setInterviews(rows)
      setDisc(discResult)
      setSensitive(confidential)
      setDocuments(files)
    }
    setLoading(false)
  }, [candidateId])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!candidate || !candidateId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not found"
          description="That candidate no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to candidates
            </Button>
          }
        />
      </div>
    )
  }

  // Plain locals so the guard's narrowing survives into the handlers below.
  const id = candidateId
  const current = candidate.currentStage
  const canManage = can(PERMISSIONS.RECRUITMENT_UPDATE)
  const nextStages = NEXT_STAGES[current]

  async function handleMove() {
    if (!targetStage) return
    setBusy(true)
    try {
      const { onboardingChecklistId } = await recruitmentService.moveCandidateStage({
        candidateId: id,
        toStage: targetStage as CandidateStage,
        joinDate: targetStage === 'ST-06' ? joinDate : undefined,
        reason: stageReason.trim() || undefined,
      })
      toast.success(`Moved to ${CANDIDATE_STAGE_LABELS[targetStage as CandidateStage]}.`)
      setTargetStage('')
      setStageReason('')
      if (onboardingChecklistId) {
        navigate(`/recruitment/onboarding/${onboardingChecklistId}`)
        return
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move the candidate.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRecordOutcome(interviewId: string) {
    setBusy(true)
    try {
      await recruitmentService.recordInterviewOutcome({
        interviewId,
        outcome,
        // The scorecard replaces the single score when the interview happened —
        // the server averages it (candidate_portal.md §13).
        criteria: outcome === 'noShow' ? undefined : scorecard,
        recommendation: outcome === 'noShow' ? undefined : recommendation,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
        notes: interviewNotes.trim() || undefined,
      })
      toast.success('Interview outcome recorded.')
      setScoringId(null)
      setScorecard(BLANK_SCORECARD)
      setStrengths('')
      setConcerns('')
      setInterviewNotes('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the outcome.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(LIST_ROUTE)} aria-label="Back to candidates">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{candidate.candidateNumber}</p>
            <h1 className="text-xl font-semibold text-foreground">{candidate.fullName}</h1>
          </div>
        </div>
        <StatusPill
          tone={CANDIDATE_STAGE_TONE[current]}
          icon={CANDIDATE_STAGE_ICON[current]}
          label={CANDIDATE_STAGE_LABELS[current]}
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Applied for</p>
            <p>{candidate.positionApplied}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
            <p>{CANDIDATE_SOURCE_LABELS[candidate.source] ?? candidate.source}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
            <p>{candidate.phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p>{candidate.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Days in stage</p>
            <p>{daysInStage(candidate.stageChangedAt)}</p>
          </div>
          {candidate.currentStage === 'ST-06' && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Time to hire</p>
              <p>{timeToHireDays(candidate) ?? '—'} days</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Interview scores</p>
            <p>
              HR {candidate.hrInterviewScore ?? '—'} · User {candidate.userInterviewScore ?? '—'}
            </p>
          </div>
          {candidate.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {candidate.applicationForm && (
        <ApplicationFormPanel form={candidate.applicationForm} sensitive={sensitive} />
      )}

      {disc && <DiscPanel result={disc} />}

      {(documents.length > 0 || candidate.appliedVia === 'portal') && (
        <CandidateDocumentsPanel documents={documents} />
      )}

      {canManage && nextStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Move stage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stageTarget">Next stage</Label>
                <Select id="stageTarget" value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
                  <option value="">Select…</option>
                  {nextStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {CANDIDATE_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </Select>
              </div>

              {targetStage === 'ST-06' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="stageJoinDate">Join date *</Label>
                  <Input
                    id="stageJoinDate"
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stageReason">Reason / note</Label>
              <Input id="stageReason" value={stageReason} onChange={(e) => setStageReason(e.target.value)} />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleMove}
                disabled={!targetStage || (targetStage === 'ST-06' && !joinDate)}
                loading={busy}
              >
                {targetStage === 'ST-06' ? 'Hire & start onboarding' : 'Move'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Interviews ({interviews.length})
        </h2>
        {canManage && (
          <Button variant="secondary" onClick={() => navigate(`/recruitment/candidates/${id}/interviews/new`)}>
            <CalendarPlus className="mr-1 h-4 w-4" aria-hidden="true" />
            Schedule interview
          </Button>
        )}
      </div>

      {interviews.length === 0 ? (
        <EmptyState title="No interviews yet" description="Scheduling one also puts it on the Calendar." />
      ) : (
        interviews.map((interview) => (
          <Card key={interview.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{CANDIDATE_STAGE_LABELS[interview.stage]}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(interview.scheduledAt)} · {interview.location}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {OUTCOME_LABELS[interview.outcome]}
                  {interview.score ? ` · ${interview.score}/5` : ''}
                </p>
              </div>

              {interview.criteria && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-sunken p-2 text-xs sm:grid-cols-3">
                  {SCORECARD_CRITERIA.map((criterion) => (
                    <p key={criterion} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{SCORECARD_CRITERION_LABELS[criterion]}</span>
                      <span className="tabular-nums text-foreground">{interview.criteria?.[criterion]}</span>
                    </p>
                  ))}
                </div>
              )}

              {interview.recommendation && (
                <p className="text-sm text-muted-foreground">
                  Recommendation: <span className="text-foreground">{RECOMMENDATION_LABELS[interview.recommendation]}</span>
                </p>
              )}

              {interview.strengths && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Strengths:</span> {interview.strengths}
                </p>
              )}

              {interview.concerns && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Concerns:</span> {interview.concerns}
                </p>
              )}

              {interview.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{interview.notes}</p>}

              {canManage && interview.outcome === 'pending' && interview.status !== 'cancelled' && (
                scoringId === interview.id ? (
                  <div className="flex flex-col gap-2 rounded-md bg-sunken p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`outcome-${interview.id}`}>Outcome</Label>
                        <Select
                          id={`outcome-${interview.id}`}
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value as 'pass' | 'fail' | 'noShow')}
                        >
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                          <option value="noShow">No show</option>
                        </Select>
                      </div>
                      {outcome !== 'noShow' && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`recommendation-${interview.id}`}>Recommendation</Label>
                          <Select
                            id={`recommendation-${interview.id}`}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value as InterviewRecommendation)}
                          >
                            {Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>

                    {outcome !== 'noShow' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SCORECARD_CRITERIA.map((criterion) => (
                          <div key={criterion} className="flex flex-col gap-1.5">
                            <Label htmlFor={`${criterion}-${interview.id}`}>
                              {SCORECARD_CRITERION_LABELS[criterion]}
                            </Label>
                            <Select
                              id={`${criterion}-${interview.id}`}
                              value={String(scorecard[criterion])}
                              onChange={(e) =>
                                setScorecard((current) => ({ ...current, [criterion]: Number(e.target.value) }))
                              }
                            >
                              {[1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}

                    {outcome !== 'noShow' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Textarea
                          aria-label="Strengths"
                          rows={2}
                          placeholder="Strengths"
                          value={strengths}
                          onChange={(e) => setStrengths(e.target.value)}
                        />
                        <Textarea
                          aria-label="Concerns"
                          rows={2}
                          placeholder="Concerns"
                          value={concerns}
                          onChange={(e) => setConcerns(e.target.value)}
                        />
                      </div>
                    )}
                    <Textarea
                      aria-label="Interview notes"
                      rows={3}
                      placeholder="Notes"
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setScoringId(null)} disabled={busy}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleRecordOutcome(interview.id)} loading={busy}>
                        Save outcome
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Button variant="secondary" onClick={() => setScoringId(interview.id)}>
                      Record outcome
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
