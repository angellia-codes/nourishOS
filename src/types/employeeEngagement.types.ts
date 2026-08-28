import type { BaseDocument } from './firestore.types'

/** planned -> completed, or cancelled at any point before then. */
export type EngagementStatus = 'planned' | 'completed' | 'cancelled'

/**
 * A company event/activity (team building, outing, celebration) — cost and
 * attendance tracking, no scheduling/approval concerns (that's the Calendar's
 * `companyEvent` event type). Participants are Employee doc ids, not auth
 * uids: most floor staff have no `users` account, so keying off the identity
 * directory (like Task/Calendar participant pickers do) would silently
 * exclude the people most likely to actually attend.
 */
export interface EmployeeEngagement extends BaseDocument {
  name: string
  description: string | null
  eventDate: string // ISO YYYY-MM-DD
  location: string | null
  /** IDR, whole number. */
  cost: number
  participantEmployeeIds: string[]
  status: EngagementStatus
}
