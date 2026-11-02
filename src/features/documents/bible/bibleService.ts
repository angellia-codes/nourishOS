import { callFunction } from '@/services/api'
import { getDocument, subscribeToDocument } from '@/services/firestore'
import type { Unsubscribe } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { BibleAccess, BibleEdition, BibleEditionPointer, BibleOutletMenu } from '@/types'

/**
 * Every read and callable the reader makes (design guide §10). A book open is
 * the pointer, the edition and one outlet doc — three reads (§6.1). SOPs and
 * Company Forms come from their own registers' services, unchanged (§6.5).
 */

export const EDITION_POINTER_ID = 'bibleEdition'

/** Resolves null when nothing has been published yet (§15 "Not published yet"). */
export async function getCurrentEdition(): Promise<BibleEdition | null> {
  const pointer = await getDocument<BibleEditionPointer>(COLLECTIONS.SYSTEM_SETTINGS, EDITION_POINTER_ID)
  if (!pointer?.currentEditionId) return null
  return getDocument<BibleEdition>(COLLECTIONS.BIBLE_EDITIONS, pointer.currentEditionId)
}

export function subscribeToOutletMenu(
  outletId: string,
  onChange: (menu: BibleOutletMenu | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToDocument<BibleOutletMenu>(COLLECTIONS.BIBLE_OUTLET_MENUS, outletId, onChange, onError)
}

export function getBibleAccess(): Promise<BibleAccess> {
  return callFunction<BibleAccess>('getBibleAccess')
}

export function setBibleOutletMenu(outletId: string, soldItemIds: string[]): Promise<{ outletId: string; added: number; removed: number }> {
  return callFunction('setBibleOutletMenu', { outletId, soldItemIds })
}
