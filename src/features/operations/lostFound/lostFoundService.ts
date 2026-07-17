import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { LostFoundItem, LostFoundCategory, LostFoundValueTier, LostFoundDisposalMethod } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateLostFoundItemInput {
  itemDescription: string
  category: LostFoundCategory
  valueTier: LostFoundValueTier
  foundLocation: string
  foundAt: string
  storageLocation: string
  linkedIncidentId?: string
}

export interface CreateLostFoundItemResult {
  itemId: string
  itemNumber: string
  retentionExpiresAt: string
}

export function createLostFoundItem(input: CreateLostFoundItemInput): Promise<CreateLostFoundItemResult> {
  return callFunction('createLostFoundItem', input)
}

export interface ClaimLostFoundItemInput {
  itemId: string
  claimantName: string
  claimantPhone?: string
  claimantEmail?: string
  claimantCustomerId?: string
  identifyingDetailsGiven: string
  idVerified: boolean
}

export function claimLostFoundItem(input: ClaimLostFoundItemInput): Promise<{ itemId: string }> {
  return callFunction('claimLostFoundItem', input)
}

export interface DisposeLostFoundItemInput {
  itemId: string
  disposalMethod: LostFoundDisposalMethod
  disposalNotes: string
  overrideBeforeRetention?: boolean
}

export function disposeLostFoundItem(input: DisposeLostFoundItemInput): Promise<{ itemId: string }> {
  return callFunction('disposeLostFoundItem', input)
}

export function getLostFoundItem(itemId: string): Promise<LostFoundItem | null> {
  return getDocument<LostFoundItem>(COLLECTIONS.LOST_FOUND_ITEMS, itemId)
}

export function subscribeToLostFoundItems(onChange: (items: LostFoundItem[]) => void): Unsubscribe {
  return subscribeToCollection<LostFoundItem>(
    COLLECTIONS.LOST_FOUND_ITEMS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}
