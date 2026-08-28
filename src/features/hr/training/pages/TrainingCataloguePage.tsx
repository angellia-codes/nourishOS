import { useEffect, useMemo, useState } from 'react'
import { Lock, Clock } from 'lucide-react'
import { Button, Card, CardContent, Select, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { useAuth, useToast } from '@/hooks'
import * as trainingService from '../trainingService'
import {
  PHASE_HINT,
  PHASE_LABELS,
  bilingual,
  formatDuration,
  recurrenceSummary,
  resolveTrainingDepartment,
} from '../trainingFormat'
import type { Department, TrainingBinding, TrainingTopic } from '@/types'

/**
 * training-module-spec-v1.0.md §9 — the HR-facing catalogue: pick a
 * department, read its delivery sequence. Read-only this pass; topic and
 * binding editing is deferred with campaigns.
 */
export function TrainingCataloguePage() {
  const toast = useToast()
  const { profile } = useAuth()
  const [departments, setDepartments] = useState<Department[] | null>(null)
  const [topics, setTopics] = useState<TrainingTopic[]>([])
  const [bindings, setBindings] = useState<TrainingBinding[] | null>(null)
  const [selected, setSelected] = useState('')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => trainingService.subscribeToTrainingDepartments(setDepartments), [])
  useEffect(() => trainingService.subscribeToTrainingTopics(setTopics), [])

  // Default to the viewer's own department's sequence — the one they are most
  // likely to be looking for.
  useEffect(() => {
    if (selected || !departments?.length) return
    const own = resolveTrainingDepartment(profile?.departmentId, profile?.outletId)
    setSelected(own && departments.some((d) => d.id === own) ? own : departments[0].id)
  }, [departments, profile?.departmentId, profile?.outletId, selected])

  useEffect(() => {
    if (!selected) return
    let active = true
    setBindings(null)
    void trainingService.getBindingsForDepartment(selected).then((rows) => {
      if (active) setBindings(rows)
    })
    return () => {
      active = false
    }
  }, [selected])

  const topicById = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics])

  async function handleSeed() {
    setSeeding(true)
    try {
      const result = await trainingService.seedTrainingCatalog()
      const created = result.departments.created + result.topics.created + result.bindings.created
      toast.success(created > 0 ? `Seeded ${created} records.` : 'Catalogue already up to date.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to seed the catalogue.')
    } finally {
      setSeeding(false)
    }
  }

  if (departments === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (departments.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <h1 className="text-xl font-semibold text-foreground">Training Catalogue</h1>
        <EmptyState
          title="Catalogue not seeded yet"
          description="The 11 departments, 197 topics and 217 delivery bindings from the master sheet load in one pass. Nothing in this module works until they do."
        />
        <PermissionGuard permission={PERMISSIONS.TRAINING_MANAGE}>
          <Button className="self-start" disabled={seeding} onClick={() => void handleSeed()}>
            {seeding ? 'Seeding…' : 'Seed catalogue'}
          </Button>
        </PermissionGuard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Training Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          {topics.length} canonical topics across {departments.length} departments.
        </p>
      </div>

      <Select aria-label="Department" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {bilingual(department.name)}
          </option>
        ))}
      </Select>

      {bindings === null ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : bindings.length === 0 ? (
        <EmptyState title="No topics bound to this department" description="Nothing to deliver here yet." />
      ) : (
        bindings.map((binding) => {
          const topic = topicById.get(binding.topicId)
          return (
            <Card key={binding.id}>
              <CardContent className="flex gap-3 p-4">
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {String(binding.sequence).padStart(2, '0')}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-medium text-foreground">{topic ? bilingual(topic.title) : binding.topicId}</p>
                  <p className="text-xs text-muted-foreground">
                    {topic ? `${PHASE_LABELS[topic.phase]} · ${PHASE_HINT[topic.phase]} · ` : ''}
                    <Clock className="inline h-3 w-3" aria-hidden="true" /> {formatDuration(topic?.durationMinutes)} ·{' '}
                    {recurrenceSummary(binding)}
                  </p>
                  <p className="text-xs text-muted-foreground">Trainer: {binding.suggestedTrainer || '—'}</p>
                  {(binding.prerequisiteTopicIds.length > 0 || binding.minTenureMonths || binding.allCoreTopics) && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>
                        {binding.prerequisiteTopicIds
                          .map((topicId) => (topicById.get(topicId) ? bilingual(topicById.get(topicId)!.title) : topicId))
                          .join(', ')}
                        {binding.allCoreTopics && (binding.prerequisiteTopicIds.length ? ' · ' : '') + 'all onboarding topics'}
                        {binding.minTenureMonths
                          ? `${binding.prerequisiteTopicIds.length || binding.allCoreTopics ? ' · ' : ''}${binding.minTenureMonths} months of service`
                          : ''}
                      </span>
                    </p>
                  )}
                  {binding.sourceNotes && <p className="text-xs text-muted-foreground">{binding.sourceNotes}</p>}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      <PermissionGuard permission={PERMISSIONS.TRAINING_MANAGE}>
        <Button variant="secondary" className="self-start" disabled={seeding} onClick={() => void handleSeed()}>
          {seeding ? 'Seeding…' : 'Re-run seed'}
        </Button>
      </PermissionGuard>
    </div>
  )
}
