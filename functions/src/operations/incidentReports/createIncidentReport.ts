import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { notifyUsersByRole } from '../../shared/notifications'
import { createTaskInternal } from '../../shared/tasks'
import { INCIDENT_ROUTING, allocateIncidentNumber, getUidsForRole, type IncidentType } from './helpers'

const INCIDENT_TYPES = Object.keys(INCIDENT_ROUTING) as IncidentType[]
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
type Severity = (typeof SEVERITIES)[number]

interface IncidentPersonInput {
  name: string
  role: 'employee' | 'customer' | 'vendor' | 'other'
  employeeId?: string
}

interface CreateIncidentReportInput {
  title: string
  description: string
  incidentType: IncidentType
  severity: Severity
  location: string
  occurredAt: string // 'YYYY-MM-DDTHH:mm'
  peopleInvolved?: IncidentPersonInput[]
  witnesses?: { name: string; contact?: string }[]
  immediateActionTaken: string
  emergencyServicesCalled?: boolean
}

/** incident-report.md §8. Severity is required (AC-1); routing + investigation task + critical-severity GM/HR notify all happen in this one call (AC-2, AC-3). */
export const createIncidentReport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.INCIDENTS_CREATE)

    const input = (request.data ?? {}) as Partial<CreateIncidentReportInput>

    if (
      !input.title ||
      !input.description ||
      !input.incidentType ||
      !INCIDENT_TYPES.includes(input.incidentType) ||
      !input.severity ||
      !SEVERITIES.includes(input.severity) ||
      !input.location ||
      !input.occurredAt ||
      !input.immediateActionTaken
    ) {
      throw new AppError(
        'invalid-argument',
        'title, description, incidentType, severity, location, occurredAt, and immediateActionTaken are required.',
      )
    }
    if (input.incidentType === 'workplaceInjury' && typeof input.emergencyServicesCalled !== 'boolean') {
      throw new AppError('invalid-argument', 'emergencyServicesCalled is required for workplace injury reports.')
    }

    const incidentNumber = await allocateIncidentNumber()
    const assignedToRole = INCIDENT_ROUTING[input.incidentType]

    const incidentRef = db.collection(COLLECTIONS.INCIDENT_REPORTS).doc()

    let linkedWorkOrderId: string | null = null
    if (input.incidentType === 'equipmentFailure') {
      // No Work Orders backend exists yet — writing the linked doc inline
      // rather than standing up a full module for one field. See plan §Phase 2.
      const workOrderRef = db.collection(COLLECTIONS.WORK_ORDERS).doc()
      await workOrderRef.set({
        title: input.title,
        description: input.description,
        location: input.location,
        priority: input.severity,
        sourceIncidentId: incidentRef.id,
        ...newDocumentBaseFields(user.uid, 'open'),
      })
      linkedWorkOrderId = workOrderRef.id
    }

    const assigneeUids = await getUidsForRole(assignedToRole)
    let investigationTaskId: string | null = null
    if (assigneeUids.length > 0) {
      investigationTaskId = await createTaskInternal({
        title: `Investigate: ${input.title}`,
        description: input.description,
        taskType: 'custom',
        sourceModule: 'incidentReports',
        referenceId: incidentRef.id,
        assignedTo: assigneeUids,
        assignedBy: user.uid,
        priority: input.severity,
      })
    }

    await incidentRef.set({
      incidentNumber,
      title: input.title,
      description: input.description,
      incidentType: input.incidentType,
      severity: input.severity,
      location: input.location,
      occurredAt: input.occurredAt,
      peopleInvolved: input.peopleInvolved ?? [],
      witnesses: input.witnesses ?? [],
      immediateActionTaken: input.immediateActionTaken,
      emergencyServicesCalled: input.emergencyServicesCalled ?? false,
      reportedBy: user.uid,
      assignedToRole,
      investigationTaskId,
      linkedWorkOrderId,
      outletId: user.outletId,
      departmentId: user.departmentId,
      ...newDocumentBaseFields(user.uid, 'reported'),
    })

    await recordAuditEvent({
      eventType: 'IncidentReported',
      category: 'Operations',
      module: 'operations',
      resourceType: 'incidentReport',
      resourceId: incidentRef.id,
      action: 'create',
      user,
      severity: input.severity,
      newValues: { incidentNumber, incidentType: input.incidentType, severity: input.severity },
    })

    const notifyTasks = [
      notifyUsersByRole({
        role: assignedToRole,
        module: 'operations',
        title: 'Incident Reported',
        message: `"${input.title}" (${incidentNumber}, ${input.severity}) at ${input.location}.`,
        referenceId: incidentRef.id,
        priority: input.severity === 'critical' ? 'critical' : 'high',
      }),
    ]
    if (input.incidentType === 'foodSafety') {
      notifyTasks.push(
        notifyUsersByRole({
          role: 'hrManager',
          module: 'operations',
          title: 'Food Safety Incident Reported',
          message: `"${input.title}" (${incidentNumber}) at ${input.location}.`,
          referenceId: incidentRef.id,
          priority: 'high',
        }),
      )
    }
    if (input.severity === 'critical') {
      notifyTasks.push(
        notifyUsersByRole({
          role: 'generalManager',
          module: 'operations',
          title: 'Critical Incident Reported',
          message: `"${input.title}" (${incidentNumber}) at ${input.location}.`,
          referenceId: incidentRef.id,
          priority: 'critical',
        }),
        notifyUsersByRole({
          role: 'hrManager',
          module: 'operations',
          title: 'Critical Incident Reported',
          message: `"${input.title}" (${incidentNumber}) at ${input.location}.`,
          referenceId: incidentRef.id,
          priority: 'critical',
        }),
      )
    }
    await Promise.all(notifyTasks)

    return successResponse({ incidentId: incidentRef.id, incidentNumber, linkedWorkOrderId }, 'Incident reported.')
  } catch (error) {
    handleError(error)
  }
})
