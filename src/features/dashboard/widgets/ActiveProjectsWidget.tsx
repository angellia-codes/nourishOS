import { useEffect, useMemo, useState } from 'react'
import { KanbanSquare } from 'lucide-react'
import { StatusPill } from '@/components/ui'
import * as projectService from '@/features/operations/projects/projectService'
import { COLUMN_LABELS, isAtRisk, milestoneProgress } from '@/features/operations/projects/projectFormat'
import { DashboardWidget, WidgetRow } from './DashboardWidget'
import type { Project } from '@/types'

const MAX_ROWS = 5

/**
 * HR_OPERATIONS.md §9.9's GM rows "Active Projects Count" and "Projects At
 * Risk", and §9.13's "Project Progress" section — one widget, since at-risk
 * projects are the ones the GM is meant to drill into and they belong at the
 * top of the same list rather than in a second card.
 */
export function ActiveProjectsWidget() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return projectService.subscribeToProjects(
      (rows) => {
        setDenied(false)
        setProjects(rows)
      },
      () => {
        setDenied(true)
        setProjects([])
      },
    )
  }, [])

  const active = useMemo(
    () =>
      (projects ?? [])
        .filter((project) => project.status === 'active')
        .sort((a, b) => Number(isAtRisk(b)) - Number(isAtRisk(a)) || a.targetDate.localeCompare(b.targetDate)),
    [projects],
  )

  const atRiskCount = active.filter((project) => isAtRisk(project)).length

  return (
    <DashboardWidget
      title="Active Projects"
      icon={KanbanSquare}
      count={projects === null ? undefined : active.length}
      viewAllTo="/operations/projects"
      loading={projects === null}
      denied={denied}
      emptyText="No projects on the board."
    >
      <div className="flex flex-col gap-2">
        {atRiskCount > 0 && <p className="text-xs text-error">{atRiskCount} past their target date</p>}
        {active.slice(0, MAX_ROWS).map((project) => {
          const progress = milestoneProgress(project)
          return (
            <WidgetRow key={project.id} to={`/operations/projects/${project.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {COLUMN_LABELS[project.column]} · target {project.targetDate}
                  {progress.total > 0 ? ` · ${progress.percent}% of milestones` : ''}
                </p>
              </div>
              {isAtRisk(project) && <StatusPill tone="error" icon={KanbanSquare} label="At risk" />}
            </WidgetRow>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
