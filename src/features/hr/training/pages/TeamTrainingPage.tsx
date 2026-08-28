import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, Input, Label, Select, Spinner, StatusPill, Textarea } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { useAuth, useFirestoreQuery, useToast } from '@/hooks'
import { where } from '@/services/firestore'
import { formatDate } from '@/utils'
import * as trainingService from '../trainingService'
import {
  ASSIGNMENT_STATUS_ICON,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_TONE,
  bilingual,
  formatDuration,
} from '../trainingFormat'
import type { Employee, TrainingAssignment, TrainingTopic } from '@/types'

/**
 * training-module-spec-v1.0.md §6.2 — the manager's verification queue.
 *
 * Scope is the caller's own department; the callable re-checks outlet and
 * department server-side (HR and Super Admin unscoped), so this list is UX,
 * not the guard.
 */
export function TeamTrainingPage() {
  const toast = useToast()
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<TrainingAssignment[] | null>(null)
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const { data: employees } = useFirestoreQuery<Employee>(
    COLLECTIONS.EMPLOYEES,
    profile?.departmentId
      ? [where('departmentId', '==', profile.departmentId), where('status', '==', 'active')]
      : [],
    [profile?.departmentId],
  )

  useEffect(() => {
    const departmentId = profile?.departmentId
    if (!departmentId) return
    return trainingService.subscribeToAssignmentsForDepartment(departmentId, setAssignments)
  }, [profile?.departmentId])

  useEffect(() => trainingService.subscribeToTrainingTopics(setTopics), [])

  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])

  const rows = useMemo(
    () =>
      (assignments ?? []).filter(
        (assignment) =>
          assignment.topicId &&
          (assignment.status === 'assigned' || assignment.status === 'locked') &&
          (!selectedEmployeeId || assignment.employeeId === selectedEmployeeId),
      ),
    [assignments, selectedEmployeeId],
  )

  if (!profile?.departmentId) {
    return <EmptyState title="No department on your profile" description="Ask HR to set your department." />
  }
  if (assignments === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Team Training</h1>
        <p className="text-sm text-muted-foreground">{rows.length} outstanding topics in your department.</p>
      </div>

      <Select
        aria-label="Filter by employee"
        value={selectedEmployeeId}
        onChange={(event) => setSelectedEmployeeId(event.target.value)}
      >
        <option value="">Everyone</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullName}
          </option>
        ))}
      </Select>

      {rows.length === 0 ? (
        <EmptyState title="Nothing outstanding" description="Every topic issued to your team has been signed off." />
      ) : (
        rows.map((assignment) => (
          <VerificationRow
            key={assignment.id}
            assignment={assignment}
            employeeName={employeeById.get(assignment.employeeId)?.fullName ?? assignment.employeeId}
            topic={assignment.topicId ? topicById.get(assignment.topicId) : undefined}
            onDone={(message) => toast.success(message)}
            onError={(message) => toast.error(message)}
          />
        ))
      )}
    </div>
  )
}

function VerificationRow({
  assignment,
  employeeName,
  topic,
  onDone,
  onError,
}: {
  assignment: TrainingAssignment
  employeeName: string
  topic: TrainingTopic | undefined
  onDone: (message: string) => void
  onError: (message: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [passed, setPassed] = useState(true)
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const isLocked = assignment.status === 'locked'

  async function handleVerify() {
    setBusy(true)
    try {
      const result = await trainingService.verifyTrainingCompletion({
        assignmentId: assignment.id,
        assessment: {
          passed,
          score: score.trim() ? Number(score) : null,
          notes: notes.trim() || null,
        },
      })
      onDone(
        result.unlocked > 0
          ? `Signed off — ${result.unlocked} further topic${result.unlocked === 1 ? '' : 's'} unlocked.`
          : 'Signed off.',
      )
      setOpen(false)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to sign off this training.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOverride() {
    setBusy(true)
    try {
      await trainingService.overrideTrainingGate(assignment.id, reason.trim())
      onDone('Gate overridden — the topic is now assigned.')
      setOpen(false)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to override the gate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <button type="button" className="flex min-h-11 items-start gap-3 text-left" onClick={() => setOpen(!open)}>
          <div className="flex-1">
            <p className="font-medium text-foreground">{employeeName}</p>
            <p className="text-sm text-foreground">{topic ? bilingual(topic.title) : assignment.topicId}</p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(topic?.durationMinutes)}
              {assignment.dueAt ? ` · due ${formatDate(assignment.dueAt)}` : ''}
            </p>
          </div>
          <StatusPill
            tone={ASSIGNMENT_STATUS_TONE[assignment.status]}
            icon={ASSIGNMENT_STATUS_ICON[assignment.status]}
            label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
          />
        </button>

        {open && !isLocked && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={passed === value}
                  onClick={() => setPassed(value)}
                  className={`min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors duration-150 ${
                    passed === value
                      ? value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-status-rejected bg-status-rejected text-status-rejected-foreground'
                      : 'border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {value ? 'Passed' : 'Not yet'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`score-${assignment.id}`}>Score (optional, 1–10)</Label>
              <Input
                id={`score-${assignment.id}`}
                type="number"
                min="1"
                max="10"
                value={score}
                onChange={(event) => setScore(event.target.value)}
              />
            </div>

            <Textarea
              aria-label="Notes"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            <Button disabled={busy} onClick={() => void handleVerify()}>
              {busy ? 'Saving…' : 'Sign off'}
            </Button>
          </div>
        )}

        {open && isLocked && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Locked behind its prerequisites. HR can force it open — the reason is recorded on the assignment and in the
              audit log.
            </p>
            <PermissionGuard
              permission={PERMISSIONS.TRAINING_MANAGE}
              fallback={<p className="text-xs text-muted-foreground">Ask HR to override the gate.</p>}
            >
              <Textarea
                aria-label="Override reason"
                placeholder="Why is this being issued early?"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Button variant="secondary" disabled={busy || !reason.trim()} onClick={() => void handleOverride()}>
                {busy ? 'Saving…' : 'Override gate'}
              </Button>
            </PermissionGuard>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
