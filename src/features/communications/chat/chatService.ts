import { callFunction } from '@/services/api'
import { subscribeToCollection, where, orderBy, limit } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ChatChannel, ChatMessage } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface CreateChannelInput {
  name: string
  description?: string
  scopeType: ChatChannel['scopeType']
  departmentId?: string
  outletId?: string
}

export function createChannel(input: CreateChannelInput): Promise<{ channelId: string }> {
  return callFunction('createChannel', input)
}

export function sendMessage(input: { channelId: string; body: string; mentionedUids?: string[] }): Promise<{ messageId: string }> {
  return callFunction('sendMessage', input)
}

/**
 * Channels are scoped one dimension at a time (company / one department / one
 * outlet), so — same shape searchService already uses for its multi-query
 * sweep — the reader fires three independent queries and merges client-side
 * rather than inventing a denormalised "visibleTo" array for a fixed 3-way
 * enum. One query being denied (e.g. no departmentId claim yet) doesn't sink
 * the other two.
 */
export function subscribeToCompanyChannels(
  onChange: (channels: ChatChannel[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ChatChannel>(
    COLLECTIONS.CHAT_CHANNELS,
    [where('scopeType', '==', 'company')],
    onChange,
    onError,
  )
}

export function subscribeToDepartmentChannels(
  departmentId: string,
  onChange: (channels: ChatChannel[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ChatChannel>(
    COLLECTIONS.CHAT_CHANNELS,
    [where('scopeType', '==', 'department'), where('departmentId', '==', departmentId)],
    onChange,
    onError,
  )
}

export function subscribeToOutletChannels(
  outletId: string,
  onChange: (channels: ChatChannel[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ChatChannel>(
    COLLECTIONS.CHAT_CHANNELS,
    [where('scopeType', '==', 'outlet'), where('outletId', '==', outletId)],
    onChange,
    onError,
  )
}

/** Flat limit, ascending, no pagination UI in v1 — text-only chat at this scale doesn't need windowing yet. */
export function subscribeToMessages(
  channelId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<ChatMessage>(
    COLLECTIONS.CHAT_MESSAGES,
    [where('channelId', '==', channelId), orderBy('createdAt', 'asc'), limit(100)],
    onChange,
    onError,
  )
}
