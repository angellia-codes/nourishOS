import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import {
  EXIT_INTERVIEW_EMPLOYEES,
  RATING_ITEMS,
  type ExitReason,
  type IntendedTenure,
  type JoinReason,
  type RatingSection,
  type RecruitmentSource,
} from './exitInterviewDemoData'
import {
  EXIT_REASON_LABELS,
  INTENDED_TENURE_LABELS,
  JOIN_REASON_LABELS,
  RATING_SCALE_LABELS,
  RATING_SECTION_LABELS,
  RECRUITMENT_SOURCE_LABELS,
} from './exitInterviewFormat'

type YesNo = 'yes' | 'no'
type RatingValue = 1 | 2 | 3 | 4

const SECTIONS: RatingSection[] = ['company', 'manager', 'culture']

/**
 * Exit Interview (digitized F009) — exit-interview.md §3. The rating blocks
 * show a representative subset of the ~32 F009 items. Confidential to HR per
 * §4 (exitInterviews.view — HR Manager/Super Admin only); mock only.
 */
export function ExitInterviewFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [employeeId, setEmployeeId] = useState(EXIT_INTERVIEW_EMPLOYEES[0].id)
  const [interviewDate, setInterviewDate] = useState('2026-07-17')
  const [recruitmentSource, setRecruitmentSource] = useState<RecruitmentSource>('jobPortal')
  const [joinReason, setJoinReason] = useState<JoinReason>('careerOpportunity')
  const [exitReason, setExitReason] = useState<ExitReason>('personal')
  const [resignationCategory, setResignationCategory] = useState<'voluntary' | 'involuntary'>('voluntary')
  const [expectationsClear, setExpectationsClear] = useState<YesNo>('yes')
  const [expectationsExplanation, setExpectationsExplanation] = useState('')
  const [trainingMet, setTrainingMet] = useState<YesNo>('yes')
  const [trainingExplanation, setTrainingExplanation] = useState('')
  const [intendedTenure, setIntendedTenure] = useState<IntendedTenure>('12m')
  const [ratings, setRatings] = useState<Record<string, RatingValue>>(
    Object.fromEntries(RATING_ITEMS.map((item) => [item.itemKey, 3 as RatingValue])),
  )
  const [wouldReturn, setWouldReturn] = useState<YesNo>('yes')
  const [wouldReturnExplanation, setWouldReturnExplanation] = useState('')
  const [employeeAck, setEmployeeAck] = useState<YesNo>('no')
  const [interviewerAck, setInterviewerAck] = useState<YesNo>('no')

  const employee = EXIT_INTERVIEW_EMPLOYEES.find((entry) => entry.id === employeeId) ?? EXIT_INTERVIEW_EMPLOYEES[0]

  const missingExplanations = useMemo(() => {
    const missing: string[] = []
    if (expectationsClear === 'no' && expectationsExplanation.trim() === '') missing.push('expectations')
    if (trainingMet === 'no' && trainingExplanation.trim() === '') missing.push('training')
    if (wouldReturn === 'no' && wouldReturnExplanation.trim() === '') missing.push('would-return')
    return missing
  }, [expectationsClear, expectationsExplanation, trainingMet, trainingExplanation, wouldReturn, wouldReturnExplanation])

  const canSubmit =
    interviewDate !== '' && missingExplanations.length === 0 && employeeAck === 'yes' && interviewerAck === 'yes'

  function setRating(itemKey: string, value: RatingValue) {
    setRatings((prev) => ({ ...prev, [itemKey]: value }))
  }

  function handleSubmit() {
    if (!canSubmit) return
    toast.success(
      `Exit interview for ${employee.name} submitted and locked (demo) — the linked "Exit Interview" offboarding task completes automatically. Nothing was written to a backend.`,
    )
    navigate('/demo/hr/offboarding')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to offboarding; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/offboarding')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Exit Interview — F009</h1>
            <p className="text-sm text-muted-foreground">Structured survey behind the offboarding "Exit Interview" task</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            Confidential — readable only by HR Manager and Super Admin (<code>exitInterviews.view</code>, exit-interview.md §4).
            Department Leaders and the rated manager never see individual records; GM sees aggregates only (min. 3 per manager).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiEmployee">Departing Employee *</Label>
              <Select id="eiEmployee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {EXIT_INTERVIEW_EMPLOYEES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} — {entry.position} ({entry.employeeNumber})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiDate">Interview Date *</Label>
              <Input id="eiDate" type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Sections A–D */}
        <Card>
          <CardHeader>
            <CardTitle>Sections A–D — Joining &amp; Leaving</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiSource">A. How did you first hear about Nourish? *</Label>
              <Select
                id="eiSource"
                value={recruitmentSource}
                onChange={(e) => setRecruitmentSource(e.target.value as RecruitmentSource)}
              >
                {Object.entries(RECRUITMENT_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiJoin">B. Most important reason you joined *</Label>
              <Select id="eiJoin" value={joinReason} onChange={(e) => setJoinReason(e.target.value as JoinReason)}>
                {Object.entries(JOIN_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiExit">C. Main reason for leaving *</Label>
              <Select id="eiExit" value={exitReason} onChange={(e) => setExitReason(e.target.value as ExitReason)}>
                {Object.entries(EXIT_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eiCategory">D. Resignation category *</Label>
              <Select
                id="eiCategory"
                value={resignationCategory}
                onChange={(e) => setResignationCategory(e.target.value as 'voluntary' | 'involuntary')}
              >
                <option value="voluntary">Voluntary</option>
                <option value="involuntary">Involuntary</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sections E–G */}
        <Card>
          <CardHeader>
            <CardTitle>Sections E–G — Expectations &amp; Tenure</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eiExpectations">E. Were job expectations clear? *</Label>
                <Select
                  id="eiExpectations"
                  value={expectationsClear}
                  onChange={(e) => setExpectationsClear(e.target.value as YesNo)}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eiTraining">F. Did training meet expectations? *</Label>
                <Select id="eiTraining" value={trainingMet} onChange={(e) => setTrainingMet(e.target.value as YesNo)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </div>
            </div>
            {expectationsClear === 'no' && (
              <Textarea
                aria-label="Explain unclear expectations"
                className="min-h-[60px]"
                placeholder="E. Please explain (required when No) *"
                value={expectationsExplanation}
                onChange={(e) => setExpectationsExplanation(e.target.value)}
              />
            )}
            {trainingMet === 'no' && (
              <Textarea
                aria-label="Explain training gap"
                className="min-h-[60px]"
                placeholder="F. Please explain (required when No) *"
                value={trainingExplanation}
                onChange={(e) => setTrainingExplanation(e.target.value)}
              />
            )}
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="eiTenure">G. How long did you intend to stay when you joined? *</Label>
              <Select
                id="eiTenure"
                value={intendedTenure}
                onChange={(e) => setIntendedTenure(e.target.value as IntendedTenure)}
              >
                {Object.entries(INTENDED_TENURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sections H–J — rating blocks */}
        {SECTIONS.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{RATING_SECTION_LABELS[section]}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {RATING_ITEMS.filter((item) => item.section === section).map((item) => (
                <div key={item.itemKey} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_260px]">
                  <p className="text-sm text-foreground">{item.itemLabel}</p>
                  <Select
                    aria-label={`Rating for ${item.itemLabel}`}
                    value={String(ratings[item.itemKey])}
                    onChange={(e) => setRating(item.itemKey, Number(e.target.value) as RatingValue)}
                  >
                    {Object.entries(RATING_SCALE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Representative subset of the F009 items for this section.</p>
            </CardContent>
          </Card>
        ))}

        {/* Section K + acknowledgments */}
        <Card>
          <CardHeader>
            <CardTitle>Section K — Closing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="eiReturn">Would you return to work for Nourish? *</Label>
              <Select id="eiReturn" value={wouldReturn} onChange={(e) => setWouldReturn(e.target.value as YesNo)}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </div>
            {wouldReturn === 'no' && (
              <Textarea
                aria-label="Explain why not returning"
                className="min-h-[60px]"
                placeholder="Please explain (required when No) *"
                value={wouldReturnExplanation}
                onChange={(e) => setWouldReturnExplanation(e.target.value)}
              />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eiEmployeeAck">Employee acknowledgment *</Label>
                <Select id="eiEmployeeAck" value={employeeAck} onChange={(e) => setEmployeeAck(e.target.value as YesNo)}>
                  <option value="no">Not yet acknowledged</option>
                  <option value="yes">Acknowledged</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eiInterviewerAck">Interviewer acknowledgment *</Label>
                <Select
                  id="eiInterviewerAck"
                  value={interviewerAck}
                  onChange={(e) => setInterviewerAck(e.target.value as YesNo)}
                >
                  <option value="no">Not yet acknowledged</option>
                  <option value="yes">Acknowledged</option>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once both parties acknowledge, the record becomes immutable — corrections go through an amendment note
              (exit-interview.md §5).
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/hr/offboarding')}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Submit &amp; Lock Interview
          </Button>
        </div>
      </div>
    </div>
  )
}
