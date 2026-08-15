import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { DisciplinaryRecord } from '@/types'
import type { DisciplinaryType } from '@/constants/hr'

export function createDisciplinaryRecord(input: {
  employeeId: string
  type: DisciplinaryType
  description: string
}): Promise<{ recordId: string }> {
  return callFunction('createDisciplinaryRecord', input)
}

export function addInvestigationNote(input: { recordId: string; note: string }): Promise<{ recordId: string }> {
  return callFunction('addInvestigationNote', input)
}

export function closeDisciplinaryRecord(recordId: string): Promise<{ recordId: string }> {
  return callFunction('closeDisciplinaryRecord', { recordId })
}

export function getDisciplinaryRecord(recordId: string): Promise<DisciplinaryRecord | null> {
  return getDocument<DisciplinaryRecord>(COLLECTIONS.DISCIPLINARY_ACTIONS, recordId)
}

/** One-shot — the profile page's "Disciplinary Records" card doesn't need a live listener. */
export function listDisciplinaryRecords(employeeId: string): Promise<DisciplinaryRecord[]> {
  return queryDocuments<DisciplinaryRecord>(COLLECTIONS.DISCIPLINARY_ACTIONS, [
    where('employeeId', '==', employeeId),
    orderBy('createdAt', 'desc'),
  ])
}
