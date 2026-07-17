import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { sendNotificationInternal, notifyUsersByRole } from '../../shared/notifications'

interface ReopenIncidentInput {
  incidentId: string
  reason: string
}

/** incident-report.md §8 AC-8. closed → reopened only; requires a reason; notifies original assignee + GM. */
export const reopenIncident = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.INCIDENTS_MANAGE)

    const input = (request.data ?? {}) as Partial<ReopenIncidentInput>
    if (!input.incidentId || !input.reason) {
      throw new AppError('invalid-argument', 'incidentId and reason are required.')
    }

    const incidentRef = db.collection(COLLECTIONS.INCIDENT_REPORTS).doc(input.incidentId)
    const incidentSnap = await incidentRef.get()
    if (!incidentSnap.exists) {
      throw new AppError('not-found', 'Incident report not found.')
    }
    const incident = incidentSnap.data()!

    if (incident.status !== 'closed') {
      throw new AppError('failed-precondition', `Only a closed incident can be reopened (currently ${incident.status}).`)
    }

    await incidentRef.update({
      status: 'reopened',
      reopenReason: input.reason,
      ...updatedFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'IncidentReopened',
      category: 'Operations',
      module: 'operations',
      resourceType: 'incidentReport',
      resourceId: incidentRef.id,
      action: 'update',
      user,
      previousValues: { status: 'closed' },
      newValues: { status: 'reopened', reason: input.reason },
    })

    if (incident.reportedBy) {
      await sendNotificationInternal({
        type: 'alert',
        title: 'Incident Reopened',
        message: `"${incident.title}" (${incident.incidentNumber}) was reopened: ${input.reason}`,
        module: 'operations',
        priority: 'high',
        recipientUid: incident.reportedBy,
        referenceModule: 'operations',
        referenceId: incidentRef.id,
      })
    }
    await notifyUsersByRole({
      role: 'generalManager',
      module: 'operations',
      title: 'Incident Reopened',
      message: `"${incident.title}" (${incident.incidentNumber}) was reopened: ${input.reason}`,
      referenceId: incidentRef.id,
      priority: 'high',
    })

    return successResponse({ incidentId: incidentRef.id }, 'Incident reopened.')
  } catch (error) {
    handleError(error)
  }
})
