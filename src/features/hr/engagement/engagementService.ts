import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { EmployeeEngagement, EngagementStatus } from '@/types'

export interface CreateEngagementInput {
  name: string
  description?: string
  eventDate: string
  location?: string
  cost: number
  participantEmployeeIds?: string[]
}

export function createEngagement(input: CreateEngagementInput): Promise<{ engagementId: string }> {
  return callFunction('createEngagement', input)
}

export interface UpdateEngagementInput {
  engagementId: string
  name?: string
  description?: string
  eventDate?: string
  location?: string
  cost?: number
  participantEmployeeIds?: string[]
  status?: EngagementStatus
  isArchived?: boolean
}

export function updateEngagement(input: UpdateEngagementInput): Promise<{ engagementId: string }> {
  return callFunction('updateEngagement', input)
}

export function getEngagement(engagementId: string): Promise<EmployeeEngagement | null> {
  return getDocument<EmployeeEngagement>(COLLECTIONS.EMPLOYEE_ENGAGEMENTS, engagementId)
}

/** Unfiltered — the list page groups Upcoming/Past client-side, same convention Projects uses. */
export function subscribeToEngagements(
  onChange: (rows: EmployeeEngagement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<EmployeeEngagement>(
    COLLECTIONS.EMPLOYEE_ENGAGEMENTS,
    [orderBy('eventDate', 'desc')],
    onChange,
    onError,
  )
}
