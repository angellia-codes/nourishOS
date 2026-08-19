import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy, type Unsubscribe } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Priority } from '@/constants/statuses'
import type { Project, ProjectColumn, ProjectMilestone } from '@/types'

export interface ProjectInput {
  name: string
  objective: string
  startDate: string
  targetDate: string
  priority: Priority
  outletId?: string
  departmentId?: string
  ownerUid?: string
  milestones?: ProjectMilestone[]
}

export function createProject(input: ProjectInput): Promise<{ projectId: string }> {
  return callFunction('createProject', input)
}

export function updateProject(input: Partial<ProjectInput> & { projectId: string }): Promise<{ projectId: string }> {
  return callFunction('updateProject', input)
}

export function submitProject(projectId: string): Promise<{ projectId: string; approvalRequestId: string }> {
  return callFunction('submitProject', { projectId })
}

export function moveProjectColumn(input: {
  projectId: string
  column: ProjectColumn
}): Promise<{ projectId: string; column: ProjectColumn }> {
  return callFunction('moveProjectColumn', input)
}

export function getProject(projectId: string): Promise<Project | null> {
  return getDocument<Project>(COLLECTIONS.PROJECTS, projectId)
}

/**
 * One unfiltered subscription, filtered client-side — the same convention the
 * other Operations registers use, so no composite index is needed. Reads are
 * already outlet-scoped by firestore.rules.
 */
export function subscribeToProjects(onChange: (rows: Project[]) => void, onError: (error: Error) => void): Unsubscribe {
  return subscribeToCollection<Project>(COLLECTIONS.PROJECTS, [orderBy('createdAt', 'desc')], onChange, onError)
}
