import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as projectService from '../projectService'
import {
  COLUMN_ICON,
  COLUMN_LABELS,
  COLUMN_SLA,
  PROJECT_COLUMNS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_VARIANT,
  PROJECT_STATUS_ICON,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  isAtRisk,
  milestoneProgress,
} from '../projectFormat'
import type { Project } from '@/types'

/**
 * HR_OPERATIONS.md §9.8 — the project Kanban. Columns are laid out as a
 * horizontally-scrolling row of stacks; a card moves column from its detail
 * page via a <Select>, the same no-drag-and-drop-dependency call
 * CandidatePipelinePage.tsx already made for the candidate board.
 *
 * Projects still awaiting approval never reach a column, so they get their own
 * section above the board rather than a sixth phantom column.
 */
export function ProjectBoardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)

  useEffect(() => {
    return projectService.subscribeToProjects(setProjects, () => setProjects([]))
  }, [])

  if (projects === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const pending = projects.filter((p) => p.status === 'draft' || p.status === 'pending_approval')
  const onBoard = projects.filter((p) => p.status === 'active' || p.status === 'completed')
  const atRiskCount = projects.filter((p) => isAtRisk(p)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {onBoard.length} on the board
            {atRiskCount > 0 ? ` · ${atRiskCount} past target date` : ''}
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.PROJECTS_CREATE}>
          <Button type="button" onClick={() => navigate('/operations/projects/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Project
          </Button>
        </PermissionGuard>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium text-foreground">Awaiting approval</p>
            {pending.map((project) => (
              <button
                key={project.id}
                type="button"
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-left transition-colors duration-150 hover:border-primary/40"
                onClick={() => navigate(`/operations/projects/${project.id}`)}
              >
                <span className="text-sm text-foreground">{project.name}</span>
                <StatusPill
                  tone={PROJECT_STATUS_TONE[project.status]}
                  icon={PROJECT_STATUS_ICON[project.status]}
                  label={PROJECT_STATUS_LABELS[project.status]}
                />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {onBoard.length === 0 ? (
        <EmptyState
          title="Nothing on the board"
          description="Approved projects appear here across the five columns."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PROJECT_COLUMNS.map((column) => {
            const cards = onBoard.filter((project) => project.column === column)
            const Icon = COLUMN_ICON[column]
            return (
              <div key={column} className="flex w-64 shrink-0 flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{COLUMN_LABELS[column]}</p>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">{COLUMN_SLA[column]}</p>

                {cards.map((project) => {
                  const progress = milestoneProgress(project)
                  return (
                    <Card
                      key={project.id}
                      className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                      onClick={() => navigate(`/operations/projects/${project.id}`)}
                    >
                      <CardContent className="flex flex-col gap-2 p-3">
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={PROJECT_PRIORITY_VARIANT[project.priority]}>
                            {PROJECT_PRIORITY_LABELS[project.priority]}
                          </Badge>
                          {isAtRisk(project) && (
                            <span className="inline-flex items-center gap-1 text-xs text-error">
                              <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                              Past target
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Target {project.targetDate}</p>
                        {progress.total > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {progress.done}/{progress.total} milestones ({progress.percent}%)
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
