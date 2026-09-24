import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Select, Spinner } from '@/components/ui'
import { useToast } from '@/hooks'
import * as appraisalService from '@/features/hr/services/appraisalService'
import type { AppraisalReviewType } from '@/types'

const REVIEW_TYPE_LABELS: Record<AppraisalReviewType, string> = {
  probation: 'Probation',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
}

/**
 * Manual, off-cycle appraisal (2026-09-24) — HR Manager / Super Admin only,
 * the same createAppraisal callable the daily scheduler uses. The scorer,
 * template and scoring model are all resolved server-side from the
 * employee's position; HR only picks the type and due date. A routed page
 * rather than a dialog: this app has no modals.
 */
export function NewAppraisalPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const today = isoDaysFromToday(0)
  const [reviewType, setReviewType] = useState<AppraisalReviewType>('quarterly')
  const [dueDate, setDueDate] = useState(isoDaysFromToday(30))
  const [periodStart, setPeriodStart] = useState(isoDaysFromToday(-90))
  const [periodLabel, setPeriodLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backTo = `/hr/employees/${employeeId}`
  const canSubmit = dueDate !== '' && periodStart !== '' && periodStart <= dueDate

  async function handleSubmit() {
    if (!employeeId || !canSubmit) return
    setSubmitting(true)
    try {
      const { appraisalId } = await appraisalService.createAppraisal({
        employeeId,
        reviewType,
        // The duplicate guard keys on employee + type + label, so a blank
        // label becomes one that is unique per due date.
        periodLabel: periodLabel.trim() || `${REVIEW_TYPE_LABELS[reviewType]} (manual) · due ${dueDate}`,
        periodStart,
        periodEnd: dueDate,
        dueDate,
      })
      toast.success('Appraisal created. The scorer, HR and GM have been notified.')
      navigate(`/hr/appraisals/${appraisalId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the appraisal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Appraisal</h1>
        <p className="text-sm text-muted-foreground">
          Uses the position's approved template. Reminders go out 14 and 7 days before the due date.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-type">Review type</Label>
            <Select
              id="review-type"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value as AppraisalReviewType)}
            >
              {Object.entries(REVIEW_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period-start">Period start *</Label>
              <Input id="period-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due-date">Due date *</Label>
              <Input id="due-date" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-label">Label (optional)</Label>
            <Input
              id="period-label"
              placeholder="e.g. Contract renewal review"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Create appraisal'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
