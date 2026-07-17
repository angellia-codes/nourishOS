import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  requireAnyPermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { sendNotificationInternal } from '../../shared/notifications'
import { INCIDENT_NEXT_STATUS, type IncidentStatus } from './helpers'

interface UpdateIncidentStatusInput {
  incidentId: string
  status: IncidentStatus
  resolutionSummary?: string
}

/** incident-report.md §8. Forward-only per INCIDENT_NEXT_STATUS; resolutionSummary required before 'resolved' (AC-5). Manager (incidents.manage) or the routed assignee may transition. */
export const updateIncidentStatus = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const input = (request.data ?? {}) as Partial<UpdateIncidentStatusInput>
    if (!input.incidentId || !input.status) {
      throw new AppError('invalid-argument', 'incidentId and status are required.')
    }

    const incidentRef = db.collection(COLLECTIONS.INCIDENT_REPORTS).doc(input.incidentId)
    const incidentSnap = await incidentRef.get()
    if (!incidentSnap.exists) {
      throw new AppError('not-found', 'Incident report not found.')
    }
    const incident = incidentSnap.data()!

    if (incident.assignedToRole !== user.roleId) {
      requireAnyPermission(user, [PERMISSIONS.INCIDENTS_MANAGE])
    }

    if (INCIDENT_NEXT_STATUS[incident.status as IncidentStatus] !== input.status) {
      throw new AppError('failed-precondition', `Cannot move from ${incident.status} to ${input.status}.`)
    }
    if (input.status === 'resolved' && !input.resolutionSummary) {
      throw new AppError('invalid-argument', 'resolutionSummary is required to resolve an incident.')
    }

    const updates: Record<string, unknown> = { status: input.status, ...updatedFields(user.uid) }
    if (input.status === 'resolved') {
      updates.resolutionSummary = input.resolutionSummary
      updates.resolvedAt = FieldValue.serverTimestamp()
      updates.resolvedBy = user.uid
    }

    await incidentRef.update(updates)

    await recordAuditEvent({
      eventType: 'IncidentStatusChanged',
      category: 'Operations',
      module: 'operations',
      resourceType: 'incidentReport',
      resourceId: incidentRef.id,
      action: 'update',
      user,
      previousValues: { status: incident.status },
      newValues: { status: input.status },
    })

    if (incident.reportedBy) {
      await sendNotificationInternal({
        type: 'alert',
        title: 'Incident Status Updated',
        message: `"${incident.title}" (${incident.incidentNumber}) is now ${input.status}.`,
        module: 'operations',
        priority: 'medium',
        recipientUid: incident.reportedBy,
        referenceModule: 'operations',
        referenceId: incidentRef.id,
      })
    }

    return successResponse({ incidentId: incidentRef.id }, 'Incident status updated.')
  } catch (error) {
    handleError(error)
  }
})
