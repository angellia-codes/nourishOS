import { subscribeToCollection, orderBy, limit } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ActivityFeedEntry } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

/**
 * communications.md §10. Company-wide, single-field orderBy (auto-indexed) —
 * module filtering happens client-side on the loaded page rather than adding
 * a compound index, same tradeoff the Notification Center's type filter makes.
 */
export function subscribeToActivityFeed(
  limitCount: number,
  onChange: (entries: ActivityFeedEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ActivityFeedEntry>(
    COLLECTIONS.ACTIVITY_FEED,
    [orderBy('createdAt', 'desc'), limit(limitCount)],
    onChange,
    onError,
  )
}
