import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import { requireText, requireIsoDate, optionalText, validateCost, validateParticipantIds } from './helpers'

interface CreateEngagementInput {
  name: string
  description?: string
  eventDate: string
  location?: string
  cost: number
  participantEmployeeIds?: string[]
}

/** A company event/activity — record, not requested; no approval chain (see CLAUDE.md). */
export const createEngagement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEE_ENGAGEMENT_MANAGE)

    const input = (request.data ?? {}) as Partial<CreateEngagementInput>

    const name = requireText(input.name, 'name', 120)
    const eventDate = requireIsoDate(input.eventDate, 'eventDate')
    const description = optionalText(input.description, 'description', 2000)
    const location = optionalText(input.location, 'location', 200)
    const cost = validateCost(input.cost)
    const participantEmployeeIds = await validateParticipantIds(input.participantEmployeeIds)

    const ref = db.collection(COLLECTIONS.EMPLOYEE_ENGAGEMENTS).doc()
    await ref.set({
      name,
      description,
      eventDate,
      location,
      cost,
      participantEmployeeIds,
      ...newDocumentBaseFields(user.uid, 'planned'),
    })

    await recordAuditEvent({
      eventType: 'EmployeeEngagementCreated',
      category: 'HR',
      module: 'hr',
      resourceType: 'employeeEngagement',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { name, eventDate, cost, participantCount: participantEmployeeIds.length },
    })

    return successResponse({ engagementId: ref.id }, 'Employee engagement record created.')
  } catch (error) {
    handleError(error)
  }
})
