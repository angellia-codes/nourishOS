import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../../lib'
import { OUTLET_DEPARTMENTS } from '../../lib/organization'
import { submitApprovalInternal } from '../../shared/approval'
import {
  COLUMN_LABELS,
  PROJECT_COLUMNS,
  PROJECT_PRIORITIES,
  parseMilestones,
  requireIsoDate,
  requireText,
  type ProjectColumn,
  type ProjectPriority,
} from './helpers'

/**
 * Project Management — HR_OPERATIONS.md §9.8 and §6.2's "projects is genuinely
 * new" decision. The project document owns the board column, the owner, the
 * dates and an embedded milestone list; the work itself is ordinary Task Engine
 * tasks carrying `sourceModule: 'operations'` + `referenceId: projectId`, per
 * §6.2's REUSE + EXTEND row for tasks.
 *
 * The lifecycle mirrors requisitions deliberately: a project is created as a
 * draft, submitted for the §9.10 "Project Request" chain (Dept. Manager → GM),
 * and only the approval-resolved handler in ./index.ts moves it onto the board.
 * That is what makes "no project starts without GM sign-off" true in the data
 * rather than merely in the UI.
 */

async function loadProject(projectId: string): Promise<{
  ref: FirebaseFirestore.DocumentReference
  data: FirebaseFirestore.DocumentData
}> {
  const id = requireText(projectId, 'projectId', 200)
  const ref = db.collection(COLLECTIONS.PROJECTS).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new AppError('not-found', 'That project no longer exists.')
  return { ref, data: snap.data()! }
}

/** The owner edits their own project; anyone else needs projects.manage. */
function requireOwnerOrManager(user: AuthedUser, project: FirebaseFirestore.DocumentData): void {
  if (project.ownerUid === user.uid || project.createdBy === user.uid) return
  requirePermission(user, PERMISSIONS.PROJECTS_MANAGE)
}

export const createProject = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PROJECTS_CREATE)

    const data = (request.data ?? {}) as Record<string, unknown>

    const name = requireText(data.name, 'Project name', 160)
    const objective = requireText(data.objective, 'Objective', 2000)
    const startDate = requireIsoDate(data.startDate, 'Start date')
    const targetDate = requireIsoDate(data.targetDate, 'Target completion date')
    if (targetDate < startDate) {
      throw new AppError('invalid-argument', 'The target completion date cannot be before the start date.')
    }

    const priority = data.priority as ProjectPriority
    if (!PROJECT_PRIORITIES.includes(priority)) {
      throw new AppError('invalid-argument', 'Pick a priority of critical, high, medium, or low.')
    }

    // Same validated-override shape Lost & Found / Incidents / Daily Updates
    // use: default to the caller's own outlet+department, allow an explicit
    // pair, but check it against the org chart rather than trusting input.
    const outletId = typeof data.outletId === 'string' && data.outletId ? data.outletId : user.outletId
    const departmentId =
      typeof data.departmentId === 'string' && data.departmentId ? data.departmentId : user.departmentId
    if (!outletId || !departmentId) {
      throw new AppError('invalid-argument', 'Pick an outlet and department for this project.')
    }
    if (!OUTLET_DEPARTMENTS[outletId]?.includes(departmentId)) {
      throw new AppError('invalid-argument', 'That department does not belong to that outlet.')
    }

    const ref = db.collection(COLLECTIONS.PROJECTS).doc()
    await ref.set({
      name,
      objective,
      startDate,
      targetDate,
      priority,
      outletId,
      departmentId,
      ownerUid: typeof data.ownerUid === 'string' && data.ownerUid ? data.ownerUid : user.uid,
      // Not on the board until the request is approved — see the module header.
      column: 'backlog' satisfies ProjectColumn,
      milestones: parseMilestones(data.milestones),
      approvalRequestId: null,
      completedAt: null,
      ...newDocumentBaseFields(user.uid, 'draft'),
    })

    await recordAuditEvent({
      eventType: 'ProjectCreated',
      category: 'Operations',
      module: 'operations',
      resourceType: 'project',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { name, priority, outletId, departmentId, targetDate },
    })

    return successResponse({ projectId: ref.id }, 'Project drafted. Submit it for approval to open it.')
  } catch (error) {
    return handleError(error)
  }
})

export const updateProject = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PROJECTS_CREATE)

    const data = (request.data ?? {}) as Record<string, unknown>
    const { ref, data: project } = await loadProject(String(data.projectId ?? ''))
    requireOwnerOrManager(user, project)

    if (project.status === 'completed' || project.status === 'cancelled') {
      throw new AppError('failed-precondition', 'A completed or cancelled project can no longer be edited.')
    }

    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = requireText(data.name, 'Project name', 160)
    if (data.objective !== undefined) updates.objective = requireText(data.objective, 'Objective', 2000)
    if (data.startDate !== undefined) updates.startDate = requireIsoDate(data.startDate, 'Start date')
    if (data.targetDate !== undefined) updates.targetDate = requireIsoDate(data.targetDate, 'Target completion date')
    if (data.milestones !== undefined) updates.milestones = parseMilestones(data.milestones)
    if (data.ownerUid !== undefined) updates.ownerUid = requireText(data.ownerUid, 'Owner', 200)
    if (data.priority !== undefined) {
      const priority = data.priority as ProjectPriority
      if (!PROJECT_PRIORITIES.includes(priority)) {
        throw new AppError('invalid-argument', 'Pick a priority of critical, high, medium, or low.')
      }
      updates.priority = priority
    }

    const startDate = (updates.startDate as string | undefined) ?? (project.startDate as string)
    const targetDate = (updates.targetDate as string | undefined) ?? (project.targetDate as string)
    if (targetDate < startDate) {
      throw new AppError('invalid-argument', 'The target completion date cannot be before the start date.')
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('invalid-argument', 'Nothing to update.')
    }

    await ref.update({ ...updates, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'ProjectUpdated',
      category: 'Operations',
      module: 'operations',
      resourceType: 'project',
      resourceId: ref.id,
      action: 'update',
      user,
      newValues: updates,
    })

    return successResponse({ projectId: ref.id }, 'Project updated.')
  } catch (error) {
    return handleError(error)
  }
})

/** Draft → pending approval, via §9.10's "Project Request" chain (Dept. Manager → GM). */
export const submitProject = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PROJECTS_CREATE)

    const { projectId } = (request.data ?? {}) as { projectId?: string }
    const { ref, data: project } = await loadProject(String(projectId ?? ''))
    requireOwnerOrManager(user, project)

    if (project.status !== 'draft') {
      throw new AppError('failed-precondition', 'That project has already been submitted.')
    }

    const approvalRequestId = await submitApprovalInternal({
      module: 'operations',
      resourceType: 'project',
      resourceId: ref.id,
      requestedBy: user.uid,
      priority: project.priority === 'critical' ? 'critical' : 'medium',
    })

    await ref.update({ status: 'pending_approval', approvalRequestId, ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'ProjectSubmitted',
      category: 'Operations',
      module: 'operations',
      resourceType: 'project',
      resourceId: ref.id,
      action: 'submit',
      user,
      newValues: { approvalRequestId },
    })

    return successResponse({ projectId: ref.id, approvalRequestId }, 'Project submitted for approval.')
  } catch (error) {
    return handleError(error)
  }
})

/**
 * The Kanban move (§9.8's five columns). Free movement in either direction —
 * work genuinely goes back from Review to In Progress — but an approved
 * project is the only thing that can be on the board at all, and reaching
 * `completed` closes the project record too.
 */
export const moveProjectColumn = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.PROJECTS_MANAGE)

    const { projectId, column } = (request.data ?? {}) as { projectId?: string; column?: string }
    const { ref, data: project } = await loadProject(String(projectId ?? ''))

    const target = column as ProjectColumn
    if (!PROJECT_COLUMNS.includes(target)) {
      throw new AppError('invalid-argument', 'That is not a board column.')
    }
    if (project.status === 'draft' || project.status === 'pending_approval') {
      throw new AppError('failed-precondition', 'The project has to be approved before it goes on the board.')
    }
    if (project.column === target) {
      throw new AppError('failed-precondition', `The project is already in ${COLUMN_LABELS[target]}.`)
    }

    const completing = target === 'completed'
    await ref.update({
      column: target,
      status: completing ? 'completed' : 'active',
      completedAt: completing ? new Date().toISOString() : null,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ProjectColumnChanged',
      category: 'Operations',
      module: 'operations',
      resourceType: 'project',
      resourceId: ref.id,
      action: 'update',
      user,
      previousValues: { column: project.column },
      newValues: { column: target },
    })

    return successResponse({ projectId: ref.id, column: target }, `Moved to ${COLUMN_LABELS[target]}.`)
  } catch (error) {
    return handleError(error)
  }
})
