import type { BaseDocument } from './firestore.types'

/** communications.md §7 — Team Chat. Text-only v1: no attachments, reactions or search. */
export type ChatScopeType = 'company' | 'department' | 'outlet'

/**
 * A channel's membership is implicit — the caller's own departmentId/outletId
 * custom claim, not an explicit members array. `scopeType==='company'` means
 * everyone; a department/outlet channel is visible to whoever's token claims
 * that department/outlet, plus elevated roles.
 */
export interface ChatChannel extends Omit<BaseDocument, 'departmentId' | 'outletId'> {
  name: string
  description: string | null
  scopeType: ChatScopeType
  departmentId: string | null
  outletId: string | null
}

/**
 * scopeType/departmentId/outletId are denormalised from the parent channel at
 * send time — see the firestore.rules comment on chatMessages for why: a list
 * query fails wholesale if any returned doc fails its own read rule.
 */
export interface ChatMessage {
  id: string
  channelId: string
  body: string
  senderUid: string
  mentionedUids: string[]
  scopeType: ChatScopeType
  departmentId: string | null
  outletId: string | null
  createdAt: string
  createdBy: string
}

/** communications.md §10 — company-wide, no audience scoping (isSignedIn() read rule). */
export interface ActivityFeedEntry {
  id: string
  eventType: string
  module: string
  title: string
  resourceType: string
  resourceId: string
  actorUid: string | null
  actionUrl: string | null
  createdAt: string
  createdBy: string
  status: string
  isArchived: boolean
}

/**
 * communications.md §11 — a durable log only. Mentions surface through the
 * Notification Center (type === 'mention'), not a page that reads this
 * collection, so nothing subscribes to it in v1.
 */
export interface Mention {
  id: string
  mentionedUid: string
  mentionedBy: string
  sourceModule: 'chat' | 'tasks'
  sourceId: string
  snippet: string
  createdAt: string
}

/** communications.md §14. Doc id is the uid. v1 enforcement is UI-only (mute dims/hides a channel client-side). */
export interface CommunicationSettings {
  id: string
  mutedChannelIds: string[]
  notifyOnMention: boolean
  notifyOnTaskAssigned: boolean
  notifyOnAnnouncement: boolean
  updatedAt: string
  updatedBy: string
}
