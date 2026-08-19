import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import type { Priority } from '@/constants/statuses'
import type { ProjectMilestone } from '@/types'
import * as projectService from '../projectService'
import { PROJECT_PRIORITY_LABELS } from '../projectFormat'

const LIST_ROUTE = '/operations/projects'

/**
 * Create and edit share one page — the same route pair every other module uses
 * (`/new` before `/:id/edit`, static segment first so the param route doesn't
 * swallow it). Outlet and department are left to the server default (the
 * caller's own), matching what the callable validates.
 */
export function ProjectFormPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [loading, setLoading] = useState(Boolean(projectId))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!projectId) return
    let active = true
    projectService
      .getProject(projectId)
      .then((project) => {
        if (!active || !project) return
        setName(project.name)
        setObjective(project.objective)
        setStartDate(project.startDate)
        setTargetDate(project.targetDate)
        setPriority(project.priority)
        setMilestones(project.milestones ?? [])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  const validMilestones = milestones.every((m) => m.title.trim() !== '' && m.dueDate !== '')
  const canSubmit =
    name.trim() !== '' && objective.trim() !== '' && startDate !== '' && targetDate !== '' && validMilestones

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        objective: objective.trim(),
        startDate,
        targetDate,
        priority,
        milestones: milestones.map((m) => ({ ...m, title: m.title.trim() })),
      }
      if (projectId) {
        await projectService.updateProject({ projectId, ...payload })
        toast.success('Project updated.')
        navigate(`/operations/projects/${projectId}`)
      } else {
        const { projectId: newId } = await projectService.createProject(payload)
        toast.success('Project drafted. Submit it for approval to open it.')
        navigate(`/operations/projects/${newId}`)
      }
    } catch {
      toast.error('Could not save the project. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function updateMilestone(index: number, patch: Partial<ProjectMilestone>) {
    setMilestones((current) => current.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{projectId ? 'Edit Project' : 'New Project'}</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Project name *</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-objective">Objective *</Label>
            <Textarea id="project-objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-start">Start date *</Label>
              <Input
                id="project-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-target">Target date *</Label>
              <Input
                id="project-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-priority">Priority</Label>
            <Select id="project-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(PROJECT_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Milestones</Label>
            {milestones.map((milestone, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <Input
                  aria-label={`Milestone ${index + 1} title`}
                  className="flex-1"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, { title: e.target.value })}
                />
                <Input
                  aria-label={`Milestone ${index + 1} due date`}
                  type="date"
                  value={milestone.dueDate}
                  onChange={(e) => updateMilestone(index, { dueDate: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Remove milestone ${index + 1}`}
                  onClick={() => setMilestones((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={milestones.length >= 25}
              onClick={() => setMilestones((current) => [...current, { title: '', dueDate: '', completed: false }])}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add milestone
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : projectId ? 'Save' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
