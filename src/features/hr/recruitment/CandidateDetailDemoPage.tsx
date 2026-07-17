import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, MessageCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import { MOCK_CANDIDATES, REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS, type CandidateStage, type StageHistoryEntry } from './candidatePipelineDemoData'
import {
  CANDIDATE_SOURCE_LABELS,
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABELS,
  CANDIDATE_STAGE_VARIANT,
  STAGE_WA_TEMPLATE,
  formatIdr,
  formatRequisitionDate,
} from './candidatePipelineFormat'

/**
 * Read-only-except-for-the-stage-move visual preview of a single candidate —
 * HR_OPERATIONS.md §9.4 (stage history, interview scores) and §9.5 (WhatsApp
 * template auto-fired on stage change, reproduced here as a toast). Mock
 * data, no Firestore reads, no backend calls. Offered salary stays hidden
 * behind an explicit reveal — schema note: "HR and Super Admin visibility
 * only" — even though this demo has no real RBAC to enforce it.
 */
export function CandidateDetailDemoPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const source = MOCK_CANDIDATES.find((c) => c.id === candidateId)

  const [showSalary, setShowSalary] = useState(false)
  const [currentStage, setCurrentStage] = useState<CandidateStage | undefined>(source?.currentStage)
  const [daysInCurrentStage, setDaysInCurrentStage] = useState(source?.daysInCurrentStage ?? 0)
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>(source?.stageHistory ?? [])
  const [targetStage, setTargetStage] = useState<CandidateStage>(source?.currentStage ?? 'ST-01')

  if (!source || !currentStage) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Candidate not found" description="This demo candidate does not exist." />
        </div>
      </div>
    )
  }

  const outlet = REQUISITION_OUTLETS.find((o) => o.id === source.outletId)?.name ?? source.outletId
  const department = REQUISITION_DEPARTMENTS.find((d) => d.id === source.departmentId)?.name ?? source.departmentId

  function handleMoveStage() {
    if (targetStage === currentStage) return
    const label = CANDIDATE_STAGE_LABELS[targetStage]
    setStageHistory((prev) => [...prev, { from: currentStage ?? null, to: targetStage, actor: 'You (demo)', timestamp: '2026-07-17' }])
    setCurrentStage(targetStage)
    setDaysInCurrentStage(0)

    const template = STAGE_WA_TEMPLATE[targetStage]
    if (template) {
      toast.success(`Moved to ${label}. WhatsApp "${template}" template sent to candidate (demo) — no message actually sent.`)
    } else {
      toast.success(`Moved to ${label} (demo) — no WhatsApp template fires for this stage.`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Moving stages shows a toast; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/pipeline')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{source.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {source.candidateNumber} &middot; {source.positionApplied} &middot; {outlet} &middot; {department}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={CANDIDATE_STAGE_VARIANT[currentStage]}>{CANDIDATE_STAGE_LABELS[currentStage]}</Badge>
          <Badge variant="neutral">Day {daysInCurrentStage} in stage</Badge>
          <Badge variant="neutral">{CANDIDATE_SOURCE_LABELS[source.source]}</Badge>
        </div>

        {source.rejectionReason && currentStage === 'ST-07' && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              <span className="font-medium">Rejected:</span> {source.rejectionReason}
            </CardContent>
          </Card>
        )}

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Phone" value={source.phone} />
            <Field label="Application Date" value={formatRequisitionDate(source.applicationDate)} />
            {source.totalDaysToHire !== undefined && <Field label="Total Days to Hire" value={String(source.totalDaysToHire)} />}
          </CardContent>
        </Card>

        {/* Interview scores */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Scores</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="HR Interview" value={source.hrInterviewScore !== undefined ? `${source.hrInterviewScore}/5` : 'Not yet recorded'} />
            <Field
              label="User Interview"
              value={source.userInterviewScore !== undefined ? `${source.userInterviewScore}/5` : 'Not yet recorded'}
            />
          </CardContent>
        </Card>

        {/* Offered salary — restricted visibility */}
        {source.offeredSalary !== undefined && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Offered Salary</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSalary((v) => !v)}>
                {showSalary ? (
                  <>
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Reveal
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="text-sm">
              {showSalary ? (
                <p className="text-foreground">{formatIdr(source.offeredSalary)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Hidden — HR Manager and Super Admin visibility only.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Move stage */}
        <Card>
          <CardHeader>
            <CardTitle>Move Stage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                aria-label="Target stage"
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as CandidateStage)}
                className="sm:flex-1"
              >
                {CANDIDATE_STAGES.map((stage) => (
                  <option key={stage.code} value={stage.code}>
                    {stage.label}
                  </option>
                ))}
              </Select>
              <Button type="button" onClick={handleMoveStage} disabled={targetStage === currentStage}>
                <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Move &amp; Notify
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Moving stage resets the "days in stage" counter and fires the matching WhatsApp template (HR_OPERATIONS.md §9.5) — shown
              here as a toast, not an actual message.
            </p>
          </CardContent>
        </Card>

        {/* Stage history */}
        <Card>
          <CardHeader>
            <CardTitle>Stage History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {stageHistory.map((entry, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="text-foreground">
                      {entry.from ? `${CANDIDATE_STAGE_LABELS[entry.from]} → ` : ''}
                      {CANDIDATE_STAGE_LABELS[entry.to]}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.actor}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRequisitionDate(entry.timestamp)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
