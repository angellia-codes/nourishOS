import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useFirestoreDoc, usePermissions, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import * as projectService from '../projectService'
import {
  COLUMN_LABELS,
  PROJECT_COLUMNS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_VARIANT,
  PROJECT_STATUS_ICON,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  milestoneProgress,
} from '../projectFormat'
import type { Project, ProjectColumn } from '@/types'

const LIST_ROUTE = '/operations/projects'

/** HR_OPERATIONS.md §9.8 — one project: its milestones, its board column, and the §9.10 approval submission. */
export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()

  const { data: project, loading } = useFirestoreDoc<Project>(COLLECTIONS.PROJECTS, projectId)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!project || !projectId) {
    return <EmptyState title="Project not found" description="It may have been removed." />
  }

  const id = projectId
  const progress = milestoneProgress(project)
  const canManage = can(PERMISSIONS.PROJECTS_MANAGE)
  const onBoard = project.status === 'active' || project.status === 'completed'

  async function handleSubmitForApproval() {
    setBusy(true)
    try {
      await projectService.submitProject(id)
      toast.success('Submitted for approval.')
    } catch {
      toast.error('Could not submit the project. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(column: ProjectColumn) {
    setBusy(true)
    try {
      await projectService.moveProjectColumn({ projectId: id, column })
      toast.success(`Moved to ${COLUMN_LABELS[column]}.`)
    } catch {
      toast.error('Could not move the project. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button type="button" variant="secondary" className="self-start" onClick={() => navigate(LIST_ROUTE)}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Back to board
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{project.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={PROJECT_PRIORITY_VARIANT[project.priority]}>
              {PROJECT_PRIORITY_LABELS[project.priority]}
            </Badge>
            <StatusPill
              tone={PROJECT_STATUS_TONE[project.status]}
              icon={PROJECT_STATUS_ICON[project.status]}
              label={PROJECT_STATUS_LABELS[project.status]}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4 pt-0">
          <p className="whitespace-pre-wrap text-sm text-foreground">{project.objective}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Start</dt>
              <dd className="text-foreground">{project.startDate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Target</dt>
              <dd className="text-foreground">{project.targetDate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Outlet</dt>
              <dd className="text-foreground">{project.outletId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Department</dt>
              <dd className="text-foreground">{project.departmentId}</dd>
            </div>
          </dl>

          {project.status === 'draft' && (
            <Button type="button" disabled={busy} onClick={handleSubmitForApproval} className="self-start">
              <Send className="mr-1 h-4 w-4" aria-hidden="true" />
              Submit for approval
            </Button>
          )}
          {project.status === 'pending_approval' && (
            <p className="text-sm text-muted-foreground">
              Waiting on the approval chain (HR Manager, then General Manager). It joins the board once approved.
            </p>
          )}
        </CardContent>
      </Card>

      {onBoard && (
        <Card>
          <CardHeader>
            <CardTitle>Board column</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            {canManage ? (
              <Select
                aria-label="Board column"
                value={project.column}
                disabled={busy}
                onChange={(e) => handleMove(e.target.value as ProjectColumn)}
              >
                {PROJECT_COLUMNS.map((column) => (
                  <option key={column} value={column}>
                    {COLUMN_LABELS[column]}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-foreground">{COLUMN_LABELS[project.column]}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Milestones {progress.total > 0 ? `(${progress.done}/${progress.total})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          {progress.total === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones recorded.</p>
          ) : (
            project.milestones.map((milestone) => (
              <div
                key={`${milestone.title}-${milestone.dueDate}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <span className="text-sm text-foreground">{milestone.title}</span>
                <span className="text-xs text-muted-foreground">
                  {milestone.dueDate} · {milestone.completed ? 'Done' : 'Open'}
                </span>
              </div>
            ))
          )}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => navigate(`/operations/projects/${id}/edit`)}
          >
            Edit project
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
