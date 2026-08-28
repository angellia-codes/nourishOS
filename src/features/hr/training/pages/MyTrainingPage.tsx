import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAuth } from '@/hooks'
import { formatDate } from '@/utils'
import * as trainingService from '../trainingService'
import {
  ASSIGNMENT_STATUS_ICON,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_TONE,
  PHASE_LABELS,
  bilingual,
  formatDuration,
  lockReason,
} from '../trainingFormat'
import type { TrainingAssignment, TrainingBinding, TrainingTopic } from '@/types'

/**
 * training-module-spec-v1.0.md §5 — "All staff, own assignments only". Reads
 * are scoped by firestore.rules against the denormalised `employeeUid`, so a
 * trainee with no linked login sees nothing here and HR acts on their behalf.
 */
export function MyTrainingPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<TrainingAssignment[] | null>(null)
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [bindings, setBindings] = useState<TrainingBinding[]>([])

  useEffect(() => {
    const uid = user?.uid
    if (!uid) return
    return trainingService.subscribeToMyAssignments(uid, setAssignments)
  }, [user?.uid])

  useEffect(() => trainingService.subscribeToTrainingTopics(setTopics), [])
  useEffect(() => {
    void trainingService.getAllBindings().then(setBindings)
  }, [])

  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])
  const bindingById = useMemo(() => new Map(bindings.map((binding) => [binding.id, binding])), [bindings])

  const rows = useMemo(() => (assignments ?? []).filter((assignment) => assignment.topicId), [assignments])
  const completedTopicIds = useMemo(
    () => new Set(rows.filter((row) => row.status === 'completed').map((row) => row.topicId as string)),
    [rows],
  )

  const open = rows.filter((row) => row.status === 'assigned').sort(byDueDate)
  const locked = rows.filter((row) => row.status === 'locked')
  const done = rows.filter((row) => row.status === 'completed')

  if (!user) return <EmptyState title="Sign in to see your training" description="" />
  if (assignments === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  function titleFor(topicId: string): string {
    const topic = topicById.get(topicId)
    return topic ? bilingual(topic.title) : topicId
  }

  function Row({ assignment }: { assignment: TrainingAssignment }) {
    const topic = assignment.topicId ? topicById.get(assignment.topicId) : undefined
    const binding = assignment.bindingId ? bindingById.get(assignment.bindingId) : undefined
    return (
      <Card>
        <CardContent className="flex flex-col gap-1.5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{topic ? bilingual(topic.title) : assignment.topicId}</p>
            <StatusPill
              tone={ASSIGNMENT_STATUS_TONE[assignment.status]}
              icon={ASSIGNMENT_STATUS_ICON[assignment.status]}
              label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {topic ? `${PHASE_LABELS[topic.phase]} · ${formatDuration(topic.durationMinutes)}` : ''}
            {binding?.suggestedTrainer ? ` · Trainer: ${binding.suggestedTrainer}` : ''}
          </p>
          {assignment.status === 'assigned' && assignment.dueAt && (
            <p className="text-xs text-muted-foreground">Due {formatDate(assignment.dueAt)}</p>
          )}
          {assignment.status === 'locked' && (
            <p className="text-xs text-muted-foreground">{lockReason(binding, titleFor, completedTopicIds)}</p>
          )}
          {assignment.status === 'completed' && (
            <p className="text-xs text-muted-foreground">
              {assignment.assessmentResult?.passed === false ? 'Assessed — not yet passed' : 'Signed off'}
              {assignment.verifiedByName ? ` by ${assignment.verifiedByName}` : ''}
              {assignment.completedAt ? ` · ${formatDate(assignment.completedAt)}` : ''}
              {assignment.assessmentResult?.score ? ` · ${assignment.assessmentResult.score}/10` : ''}
            </p>
          )}
          {assignment.overrideReason && (
            <p className="text-xs text-muted-foreground">Gate overridden: {assignment.overrideReason}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Training</h1>
        <p className="text-sm text-muted-foreground">
          {done.length} of {rows.length} topics complete.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No training assigned"
          description="Topics are issued when you join a department. Ask HR if you expected something here."
        />
      ) : (
        <>
          <Section title="To do" count={open.length}>
            {open.map((assignment) => (
              <Row key={assignment.id} assignment={assignment} />
            ))}
          </Section>
          <Section title="Locked" count={locked.length}>
            {locked.map((assignment) => (
              <Row key={assignment.id} assignment={assignment} />
            ))}
          </Section>
          <Section title="Completed" count={done.length}>
            {done.map((assignment) => (
              <Row key={assignment.id} assignment={assignment} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-foreground">
        {title} ({count})
      </h2>
      {children}
    </div>
  )
}

function byDueDate(a: TrainingAssignment, b: TrainingAssignment): number {
  return (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999')
}
