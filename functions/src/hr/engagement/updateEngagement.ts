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
import { requireText, requireIsoDate, optionalText, validateCost, validateParticipantIds } from './helpers'

const ENGAGEMENT_STATUSES = ['planned', 'completed', 'cancelled'] as const

interface UpdateEngagementInput {
  engagementId: string
  name?: string
  description?: string
  eventDate?: string
  location?: string
  cost?: number
  participantEmployeeIds?: string[]
  status?: (typeof ENGAGEMENT_STATUSES)[number]
  isArchived?: boolean
}

export const updateEngagement = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEE_ENGAGEMENT_MANAGE)

    const input = (request.data ?? {}) as Partial<UpdateEngagementInput>
    if (!input.engagementId) {
      throw new AppError('invalid-argument', 'engagementId is required.')
    }

    const ref = db.collection(COLLECTIONS.EMPLOYEE_ENGAGEMENTS).doc(input.engagementId)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new AppError('not-found', 'That engagement record no longer exists.')
    }
    const existing = snap.data() as Record<string, unknown>

    const changes: Record<string, unknown> = {}

    if (input.name !== undefined) changes.name = requireText(input.name, 'name', 120)
    if (input.eventDate !== undefined) changes.eventDate = requireIsoDate(input.eventDate, 'eventDate')
    if (input.description !== undefined) changes.description = optionalText(input.description, 'description', 2000)
    if (input.location !== undefined) changes.location = optionalText(input.location, 'location', 200)
    if (input.cost !== undefined) changes.cost = validateCost(input.cost)
    if (input.participantEmployeeIds !== undefined) {
      changes.participantEmployeeIds = await validateParticipantIds(input.participantEmployeeIds)
    }
    if (input.status !== undefined) {
      if (!ENGAGEMENT_STATUSES.includes(input.status)) {
        throw new AppError('invalid-argument', `status must be one of: ${ENGAGEMENT_STATUSES.join(', ')}.`)
      }
      changes.status = input.status
    }
    if (input.isArchived !== undefined) {
      changes.isArchived = Boolean(input.isArchived)
    }

    if (Object.keys(changes).length === 0) {
      throw new AppError('invalid-argument', 'No updatable fields were provided.')
    }

    await ref.update({ ...changes, ...updatedFields(user.uid) })

    const previousValues: Record<string, unknown> = {}
    for (const key of Object.keys(changes)) previousValues[key] = existing[key] ?? null

    await recordAuditEvent({
      eventType: 'EmployeeEngagementUpdated',
      category: 'HR',
      module: 'hr',
      resourceType: 'employeeEngagement',
      resourceId: input.engagementId,
      action: 'update',
      user,
      previousValues,
      newValues: changes,
    })

    return successResponse({ engagementId: input.engagementId }, 'Employee engagement record updated.')
  } catch (error) {
    handleError(error)
  }
})
