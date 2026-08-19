import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type { Sop, SopAccess } from '@/types'
import type { Role } from '@/constants/roles'

/** The singleton doc id inside systemSettings that firestore.rules reads. */
export const ACCESS_DOC_ID = 'sopAccess'

export interface SopInput {
  departmentId: string
  sopNumber: string
  topic: string
  driveUrl: string
}

export function createSop(input: SopInput): Promise<{ sopId: string }> {
  return callFunction('createSop', input)
}

export function updateSop(input: SopInput & { sopId: string }): Promise<{ sopId: string }> {
  return callFunction('updateSop', input)
}

export function deleteSop(sopId: string): Promise<{ sopId: string }> {
  return callFunction('deleteSop', { sopId })
}

export function setSopAccess(roleIds: Role[]): Promise<{ roleIds: Role[] }> {
  return callFunction('setSopAccess', { roleIds })
}

export function getSop(sopId: string): Promise<Sop | null> {
  return getDocument<Sop>(COLLECTIONS.SOPS, sopId)
}

/**
 * Live library, ordered so the list groups cleanly by department without a
 * client-side sort. Backed by the sops composite index.
 */
export function subscribeToSops(
  onChange: (rows: Sop[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<Sop>(
    COLLECTIONS.SOPS,
    [where('isArchived', '==', false), orderBy('departmentId'), orderBy('sopNumber')],
    onChange,
    onError,
  )
}

export function getSopAccess(): Promise<SopAccess | null> {
  return getDocument<SopAccess>(COLLECTIONS.SYSTEM_SETTINGS, ACCESS_DOC_ID)
}
