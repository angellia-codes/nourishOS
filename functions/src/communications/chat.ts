import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  PERMISSIONS,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../lib'
import { OUTLET_DEPARTMENTS, DEPARTMENT_ROLES } from '../lib/organization'
import { recordMentionsInternal } from '../shared/activity'

/**
 * Team Chat — communications.md §7. Text-only v1: no attachments, emoji
 * reactions or search (confirmed scope decision) — those are fast-follow
 * work, the same way Announcements deferred its rich-text editor.
 *
 * Channels are scoped company-wide / to one department / to one outlet, and
 * membership is implicit from the caller's own departmentId/outletId custom
 * claim rather than an explicit members array — the same "empty/company ==
 * everyone" shape Announcements' audience uses, just collapsed to a single
 * dimension since a channel (unlike an announcement) only ever targets one
 * scope at a time.
 */

const SCOPE_TYPES = ['company', 'department', 'outlet'] as const
type ScopeType = (typeof SCOPE_TYPES)[number]

const VALID_OUTLET_IDS = Object.keys(OUTLET_DEPARTMENTS)
const VALID_DEPARTMENT_IDS = Object.keys(DEPARTMENT_ROLES)

interface ChannelScope {
  scopeType: ScopeType
  departmentId: string | null
  outletId: string | null
}

function validateScope(input: { scopeType?: unknown; departmentId?: unknown; outletId?: unknown }): ChannelScope {
  const scopeType = input.scopeType as ScopeType
  if (!SCOPE_TYPES.includes(scopeType)) {
    throw new AppError('invalid-argument', `scopeType must be one of: ${SCOPE_TYPES.join(', ')}.`)
  }

  if (scopeType === 'department') {
    const departmentId = input.departmentId as string
    if (!departmentId || !VALID_DEPARTMENT_IDS.includes(departmentId)) {
      throw new AppError('invalid-argument', 'A valid departmentId is required for a department-scoped channel.')
    }
    return { scopeType, departmentId, outletId: null }
  }

  if (scopeType === 'outlet') {
    const outletId = input.outletId as string
    if (!outletId || !VALID_OUTLET_IDS.includes(outletId)) {
      throw new AppError('invalid-argument', 'A valid outletId is required for an outlet-scoped channel.')
    }
    return { scopeType, departmentId: null, outletId }
  }

  return { scopeType, departmentId: null, outletId: null }
}

/** Same rule the client-side subscriptions and firestore.rules both enforce — kept here so sendMessage can't be sent into a channel the caller can't read. */
function assertInScope(user: AuthedUser, scope: ChannelScope): void {
  if (user.roleId === 'superAdmin') return
  if (scope.scopeType === 'company') return
  if (scope.scopeType === 'department' && scope.departmentId === user.departmentId) return
  if (scope.scopeType === 'outlet' && scope.outletId === user.outletId) return
  throw new AppError('permission-denied', 'You are not a member of this channel.')
}

export const createChannel = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHAT_MANAGE_CHANNELS)

    const data = (request.data ?? {}) as {
      name?: string
      description?: string
      scopeType?: string
      departmentId?: string
      outletId?: string
    }

    const name = data.name?.trim() ?? ''
    if (!name) {
      throw new AppError('invalid-argument', 'A channel name is required.')
    }
    if (name.length > 80) {
      throw new AppError('invalid-argument', 'Channel name must be 80 characters or fewer.')
    }
    const description = data.description?.trim() || null

    const scope = validateScope(data)

    const ref = db.collection(COLLECTIONS.CHAT_CHANNELS).doc()
    await ref.set({
      name,
      description,
      ...scope,
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'ChannelCreated',
      category: 'Communications',
      module: 'communications',
      resourceType: 'chatChannel',
      resourceId: ref.id,
      action: 'create',
      user,
      newValues: { name, ...scope },
    })

    return successResponse({ channelId: ref.id }, 'Channel created.')
  } catch (error) {
    return handleError(error)
  }
})

export const sendMessage = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.CHAT_SEND)

    const data = (request.data ?? {}) as { channelId?: string; body?: string; mentionedUids?: string[] }
    const channelId = data.channelId?.trim() ?? ''
    if (!channelId) {
      throw new AppError('invalid-argument', 'channelId is required.')
    }
    const body = data.body?.trim() ?? ''
    if (!body) {
      throw new AppError('invalid-argument', 'A message cannot be empty.')
    }
    if (body.length > 2000) {
      throw new AppError('invalid-argument', 'Message must be 2000 characters or fewer.')
    }
    const mentionedUids = Array.isArray(data.mentionedUids) ? data.mentionedUids.filter((uid) => typeof uid === 'string') : []

    const channelRef = db.collection(COLLECTIONS.CHAT_CHANNELS).doc(channelId)
    const channelSnap = await channelRef.get()
    if (!channelSnap.exists) {
      throw new AppError('not-found', 'That channel no longer exists.')
    }
    const channel = channelSnap.data()!
    if (channel.isArchived) {
      throw new AppError('failed-precondition', 'This channel is archived.')
    }

    const scope: ChannelScope = {
      scopeType: channel.scopeType,
      departmentId: channel.departmentId ?? null,
      outletId: channel.outletId ?? null,
    }
    assertInScope(user, scope)

    const ref = db.collection(COLLECTIONS.CHAT_MESSAGES).doc()
    await ref.set({
      channelId,
      body,
      senderUid: user.uid,
      mentionedUids,
      ...scope,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    })

    if (mentionedUids.length > 0) {
      await recordMentionsInternal({
        mentionedUids,
        mentionedBy: user.uid,
        mentionedByName: user.displayName,
        sourceModule: 'chat',
        sourceId: channelId,
        snippet: body,
        actionUrl: `/communications/chat/${channelId}`,
      })
    }

    await recordAuditEvent({
      eventType: 'MessageSent',
      category: 'Communications',
      module: 'communications',
      resourceType: 'chatMessage',
      resourceId: ref.id,
      action: 'create',
      user,
      metadata: { channelId },
    })

    return successResponse({ messageId: ref.id }, 'Message sent.')
  } catch (error) {
    return handleError(error)
  }
})
