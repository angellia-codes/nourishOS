import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { queryDocuments, where } from '@/services/firestore'
import { usePermissions, useToast } from '@/hooks'
import * as recruitmentService from '../recruitmentService'
import { CANDIDATE_STAGE_LABELS, type Candidate, type CandidateStage, type UserProfile } from '@/types'

/**
 * Schedule an interview — HR_OPERATIONS.md 9.4-F05.
 *
 * Writes the interview, a calendar event and a task for the interviewer in one
 * call. If the interviewer already has something in that slot the server
 * refuses once with the conflict message; confirming resubmits with an override
 * reason, the same two-step the Calendar form uses.
 */
export function InterviewFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { candidateId } = useParams<{ candidateId: string }>()

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  // The user doc's id is the uid; UserProfile.uid is only populated for the
  // signed-in profile, so the doc id is what identifies an interviewer here.
  const [interviewers, setInterviewers] = useState<Array<UserProfile & { id: string }>>([])
  const [stage, setStage] = useState<CandidateStage>('ST-03')
  const [interviewerUid, setInterviewerUid] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('45')
  const [location, setLocation] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [row, users] = await Promise.all([
          candidateId ? recruitmentService.getCandidate(candidateId) : Promise.resolve(null),
          queryDocuments<UserProfile & { id: string }>(COLLECTIONS.USERS, [where('status', '==', 'active')]),
        ])
        if (cancelled) return
        setCandidate(row)
        setInterviewers(users)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [candidateId])

  const canSubmit = interviewerUid !== '' && scheduledAt !== '' && location.trim() !== ''

  async function handleSchedule(overrideReason?: string) {
    if (!canSubmit || !candidateId) return
    setSubmitting(true)
    try {
      await recruitmentService.scheduleInterview({
        candidateId,
        stage,
        interviewerUid,
        // datetime-local has no zone; the browser's own zone is the right one
        // here — whoever schedules it is in the same place as the interview.
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes),
        location: location.trim(),
        overrideReason,
      })
      toast.success('Interview scheduled.')
      navigate(`/hr/candidates/${candidateId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not schedule the interview.'
      if (!overrideReason && message.includes('overlapping commitment')) {
        setConflict(message)
      } else {
        toast.error(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!can(PERMISSIONS.RECRUITMENT_UPDATE)) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="No access"
          description="Your role can't schedule interviews."
          action={
            <Button variant="secondary" onClick={() => navigate('/hr/candidates')}>
              Back to candidates
            </Button>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not found"
          description="That candidate no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate('/hr/candidates')}>
              Back to candidates
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Schedule interview — {candidate.fullName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Adds a calendar event for the interviewer and a task to record the score afterwards. The candidate is
          contacted separately — automated WhatsApp invitations aren't wired up.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interviewStage">Stage *</Label>
            <Select id="interviewStage" value={stage} onChange={(e) => setStage(e.target.value as CandidateStage)}>
              <option value="ST-03">{CANDIDATE_STAGE_LABELS['ST-03']}</option>
              <option value="ST-04">{CANDIDATE_STAGE_LABELS['ST-04']}</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interviewer">Interviewer *</Label>
            <Select id="interviewer" value={interviewerUid} onChange={(e) => setInterviewerUid(e.target.value)}>
              <option value="">Select…</option>
              {interviewers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.email}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interviewAt">Date & time *</Label>
            <Input
              id="interviewAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(e.target.value)
                setConflict(null)
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interviewDuration">Duration (minutes) *</Label>
            <Input
              id="interviewDuration"
              type="number"
              min={15}
              max={480}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="interviewLocation">Location *</Label>
          <Input
            id="interviewLocation"
            value={location}
            maxLength={200}
            placeholder="e.g. BOH meeting room, or a video link"
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {conflict && (
          <div className="rounded-md border border-status-pending bg-sunken p-3 text-sm text-foreground">
            <p>{conflict}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => handleSchedule('Scheduled over an existing commitment.')} loading={submitting}>
                Schedule anyway
              </Button>
              <Button variant="ghost" onClick={() => setConflict(null)} disabled={submitting}>
                Pick another time
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(`/hr/candidates/${candidateId}`)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => handleSchedule()} disabled={!canSubmit} loading={submitting}>
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
