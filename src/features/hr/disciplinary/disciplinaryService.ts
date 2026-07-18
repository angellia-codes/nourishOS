import { orderBy, where } from 'firebase/firestore'
import { callFunction } from '@/services/api'
import { queryDocuments, subscribeToCollection } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { AckParty, DisciplinaryAction, DisciplinaryType } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export interface CreateDisciplinaryInput {
  employeeId: string
  incidentDetails: string
  disciplinaryType: DisciplinaryType
  employeeStatement?: string
  proposedSolution?: string
  companyFurtherAction?: string
  employeeFurtherAction?: string
  linkedIncidentId?: string
}

export function createDisciplinaryAction(input: CreateDisciplinaryInput): Promise<{ actionId: string; actionNumber: string }> {
  return callFunction('createDisciplinaryAction', input)
}

export function submitDisciplinaryAction(actionId: string): Promise<{ actionId: string }> {
  return callFunction('submitDisciplinaryAction', { actionId })
}

export function acknowledgeDisciplinaryAction(actionId: string, party: AckParty): Promise<{ actionId: string; finalized: boolean }> {
  return callFunction('acknowledgeDisciplinaryAction', { actionId, party })
}

export function subscribeToDisciplinaryActions(onChange: (actions: DisciplinaryAction[]) => void): Unsubscribe {
  return subscribeToCollection<DisciplinaryAction>(
    COLLECTIONS.DISCIPLINARY_ACTIONS,
    [where('isArchived', '==', false), orderBy('createdAt', 'desc')],
    onChange,
  )
}

/**
 * employee-disciplinary-action.md §5 (AC-6) — the active-level query helper.
 * Surfaces the employee's current unexpired finalized record so HR sees whether
 * a new incident continues an existing ladder or starts fresh at Coaching.
 */
export async function getActiveDisciplinaryLevel(employeeId: string): Promise<DisciplinaryAction | null> {
  const finalized = await queryDocuments<DisciplinaryAction>(COLLECTIONS.DISCIPLINARY_ACTIONS, [
    where('employeeId', '==', employeeId),
    where('status', '==', 'finalized'),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const active = finalized.filter((a) => a.validUntil >= today).sort((a, b) => b.validUntil.localeCompare(a.validUntil))
  return active[0] ?? null
}
