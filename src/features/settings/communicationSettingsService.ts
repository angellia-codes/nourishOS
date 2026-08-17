import { callFunction } from '@/services/api'
import { subscribeToDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { CommunicationSettings } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface UpdateCommunicationSettingsInput {
  mutedChannelIds?: string[]
  notifyOnMention?: boolean
  notifyOnTaskAssigned?: boolean
  notifyOnAnnouncement?: boolean
}

export function updateCommunicationSettings(input: UpdateCommunicationSettingsInput): Promise<void> {
  return callFunction('updateCommunicationSettings', input)
}

/** Doc id is the caller's own uid — firestore.rules only allows reading your own. */
export function subscribeToMySettings(
  uid: string,
  onChange: (settings: CommunicationSettings | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToDocument<CommunicationSettings>(COLLECTIONS.COMMUNICATION_SETTINGS, uid, onChange, onError)
}
