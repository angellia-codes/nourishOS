import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Checkbox, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import {
  EXIT_INTERVIEW_RATING_ITEMS,
  EXIT_REASON_LABELS,
  EXIT_REASONS,
  INTENDED_TENURE_LABELS,
  INTENDED_TENURES,
  JOIN_REASON_LABELS,
  JOIN_REASONS,
  type ExitInterviewRatingItemDef,
} from '@/constants/exitInterview'
import { CANDIDATE_SOURCE_LABELS } from '@/features/hr/recruitment/recruitmentFormat'
import { CANDIDATE_SOURCES } from '@/types'
import * as offboardingService from '../offboardingService'
import type { ExitInterviewRating, OffboardingChecklist } from '@/types'

const YES_NO: Array<{ value: 'yes' | 'no'; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

/**
 * exit-interview.md — the F009 structured survey behind the "Exit Interview"
 * offboarding task. Rating item wording is placeholder (see
 * src/constants/exitInterview.ts's header comment) until the real F009 docx
 * text is available.
 */
export function ExitInterviewFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<OffboardingChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [interviewDate, setInterviewDate] = useState('')
  const [recruitmentSource, setRecruitmentSource] = useState('')
  const [recruitmentSourceOther, setRecruitmentSourceOther] = useState('')
  const [joinReason, setJoinReason] = useState('')
  const [joinReasonOther, setJoinReasonOther] = useState('')
  const [exitReason, setExitReason] = useState('')
  const [exitReasonOther, setExitReasonOther] = useState('')
  const [resignationCategory, setResignationCategory] = useState<'voluntary' | 'involuntary' | ''>('')
  const [expectationsWereClear, setExpectationsWereClear] = useState<'yes' | 'no' | ''>('')
  const [expectationsExplanation, setExpectationsExplanation] = useState('')
  const [trainingMetExpectations, setTrainingMetExpectations] = useState<'yes' | 'no' | ''>('')
  const [trainingExplanation, setTrainingExplanation] = useState('')
  const [intendedTenure, setIntendedTenure] = useState('')
  const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4>>({})
  const [wouldReturnToWork, setWouldReturnToWork] = useState<'yes' | 'no' | ''>('')
  const [wouldReturnExplanation, setWouldReturnExplanation] = useState('')
  const [employeeAcknowledged, setEmployeeAcknowledged] = useState(false)
  const [interviewerAcknowledged, setInterviewerAcknowledged] = useState(false)

  useEffect(() => {
    if (!checklistId) return
    offboardingService
      .getOffboardingChecklist(checklistId)
      .then(setChecklist)
      .finally(() => setLoading(false))
  }, [checklistId])

  const ratingsBySection = useMemo(() => {
    const groups: Record<'company' | 'manager' | 'culture', ExitInterviewRatingItemDef[]> = {
      company: [],
      manager: [],
      culture: [],
    }
    for (const item of EXIT_INTERVIEW_RATING_ITEMS) groups[item.section].push(item)
    return groups
  }, [])

  const allScored = EXIT_INTERVIEW_RATING_ITEMS.every((item) => scores[item.itemKey])

  const canSubmit =
    !!interviewDate &&
    !!recruitmentSource &&
    !!joinReason &&
    !!exitReason &&
    !!resignationCategory &&
    !!intendedTenure &&
    expectationsWereClear !== '' &&
    (expectationsWereClear === 'yes' || expectationsExplanation.trim() !== '') &&
    trainingMetExpectations !== '' &&
    (trainingMetExpectations === 'yes' || trainingExplanation.trim() !== '') &&
    wouldReturnToWork !== '' &&
    (wouldReturnToWork === 'yes' || wouldReturnExplanation.trim() !== '') &&
    allScored &&
    employeeAcknowledged &&
    interviewerAcknowledged

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!checklist || !checklistId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState title="Not found" description="That offboarding checklist no longer exists." />
      </div>
    )
  }

  async function handleSubmit() {
    if (!checklistId || !checklist || !canSubmit) return
    setSubmitting(true)
    try {
      const ratings: ExitInterviewRating[] = EXIT_INTERVIEW_RATING_ITEMS.map((item) => ({
        section: item.section,
        itemKey: item.itemKey,
        itemLabel: item.itemLabel,
        score: scores[item.itemKey],
      }))

      await offboardingService.submitExitInterview({
        employeeId: checklist.employeeId,
        offboardingChecklistId: checklistId,
        interviewDate,
        recruitmentSource,
        recruitmentSourceOther: recruitmentSource === 'other' ? recruitmentSourceOther.trim() : undefined,
        joinReason,
        joinReasonOther: joinReason === 'other' ? joinReasonOther.trim() : undefined,
        exitReason,
        exitReasonOther: exitReason === 'other' ? exitReasonOther.trim() : undefined,
        resignationCategory: resignationCategory as 'voluntary' | 'involuntary',
        expectationsWereClear: expectationsWereClear === 'yes',
        expectationsExplanation: expectationsWereClear === 'no' ? expectationsExplanation.trim() : undefined,
        trainingMetExpectations: trainingMetExpectations === 'yes',
        trainingExplanation: trainingMetExpectations === 'no' ? trainingExplanation.trim() : undefined,
        intendedTenure,
        ratings,
        wouldReturnToWork: wouldReturnToWork === 'yes',
        wouldReturnExplanation: wouldReturnToWork === 'no' ? wouldReturnExplanation.trim() : undefined,
        employeeAcknowledged,
        interviewerAcknowledged,
      })
      toast.success('Exit interview recorded.')
      navigate(`/hr/offboarding/${checklistId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit the exit interview.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Exit Interview</h1>
        <p className="text-sm text-muted-foreground">{checklist.employeeName} — confidential, HR only.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interviewDate">Interview date *</Label>
            <Input id="interviewDate" type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recruitmentSource">Section A — How did they first hear about Nourish? *</Label>
            <Select id="recruitmentSource" value={recruitmentSource} onChange={(e) => setRecruitmentSource(e.target.value)}>
              <option value="">Select…</option>
              {CANDIDATE_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {CANDIDATE_SOURCE_LABELS[source] ?? source}
                </option>
              ))}
            </Select>
            {recruitmentSource === 'other' && (
              <Textarea placeholder="Please specify" value={recruitmentSourceOther} onChange={(e) => setRecruitmentSourceOther(e.target.value)} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="joinReason">Section B — Most important reason they joined *</Label>
            <Select id="joinReason" value={joinReason} onChange={(e) => setJoinReason(e.target.value)}>
              <option value="">Select…</option>
              {JOIN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {JOIN_REASON_LABELS[reason]}
                </option>
              ))}
            </Select>
            {joinReason === 'other' && (
              <Textarea placeholder="Please specify" value={joinReasonOther} onChange={(e) => setJoinReasonOther(e.target.value)} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exitReason">Section C — Main reason for leaving *</Label>
            <Select id="exitReason" value={exitReason} onChange={(e) => setExitReason(e.target.value)}>
              <option value="">Select…</option>
              {EXIT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {EXIT_REASON_LABELS[reason]}
                </option>
              ))}
            </Select>
            {exitReason === 'other' && (
              <Textarea placeholder="Please specify" value={exitReasonOther} onChange={(e) => setExitReasonOther(e.target.value)} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resignationCategory">Section D — Resignation category *</Label>
            <Select
              id="resignationCategory"
              value={resignationCategory}
              onChange={(e) => setResignationCategory(e.target.value as 'voluntary' | 'involuntary')}
            >
              <option value="">Select…</option>
              <option value="voluntary">Voluntary</option>
              <option value="involuntary">Involuntary</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expectationsWereClear">Section E — Were expectations clear at hire? *</Label>
            <Select
              id="expectationsWereClear"
              value={expectationsWereClear}
              onChange={(e) => setExpectationsWereClear(e.target.value as 'yes' | 'no')}
            >
              <option value="">Select…</option>
              {YES_NO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {expectationsWereClear === 'no' && (
              <Textarea
                placeholder="Explain *"
                value={expectationsExplanation}
                onChange={(e) => setExpectationsExplanation(e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trainingMetExpectations">Section F — Did training meet expectations? *</Label>
            <Select
              id="trainingMetExpectations"
              value={trainingMetExpectations}
              onChange={(e) => setTrainingMetExpectations(e.target.value as 'yes' | 'no')}
            >
              <option value="">Select…</option>
              {YES_NO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {trainingMetExpectations === 'no' && (
              <Textarea placeholder="Explain *" value={trainingExplanation} onChange={(e) => setTrainingExplanation(e.target.value)} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intendedTenure">Section G — How long did they intend to stay when they joined? *</Label>
            <Select id="intendedTenure" value={intendedTenure} onChange={(e) => setIntendedTenure(e.target.value)}>
              <option value="">Select…</option>
              {INTENDED_TENURES.map((t) => (
                <option key={t} value={t}>
                  {INTENDED_TENURE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {(['company', 'manager', 'culture'] as const).map((section) => (
        <Card key={section}>
          <CardContent className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section === 'company' ? 'Section H — Company' : section === 'manager' ? 'Section I — Manager' : 'Section J — Culture'}
            </h2>
            {ratingsBySection[section].map((item) => (
              <div key={item.itemKey} className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-foreground">{item.itemLabel}</p>
                <Select
                  aria-label={item.itemLabel}
                  value={scores[item.itemKey] ?? ''}
                  onChange={(e) => setScores((prev) => ({ ...prev, [item.itemKey]: Number(e.target.value) as 1 | 2 | 3 | 4 }))}
                >
                  <option value="">Score…</option>
                  <option value="1">1 — Very Bad</option>
                  <option value="2">2 — Bad</option>
                  <option value="3">3 — Good</option>
                  <option value="4">4 — Very Good</option>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wouldReturnToWork">Section K — Would they consider working here again? *</Label>
            <Select id="wouldReturnToWork" value={wouldReturnToWork} onChange={(e) => setWouldReturnToWork(e.target.value as 'yes' | 'no')}>
              <option value="">Select…</option>
              {YES_NO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {wouldReturnToWork === 'no' && (
              <Textarea
                placeholder="Explain *"
                value={wouldReturnExplanation}
                onChange={(e) => setWouldReturnExplanation(e.target.value)}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={employeeAcknowledged} onChange={(e) => setEmployeeAcknowledged(e.target.checked)} />
            Employee acknowledges this interview
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={interviewerAcknowledged} onChange={(e) => setInterviewerAcknowledged(e.target.checked)} />
            Interviewer (HR) acknowledges this interview
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(`/hr/offboarding/${checklistId}`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting}>
              Submit exit interview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
