import { callFunction } from '@/services/api'
import { getDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { ChecklistCompletion, ChecklistType } from '@/types'

const COLLECTION_FOR_TYPE: Record<ChecklistType, string> = {
  opening: COLLECTIONS.OPENING_CHECKLISTS,
  closing: COLLECTIONS.CLOSING_CHECKLISTS,
}

export function saveChecklistProgress(input: {
  type: ChecklistType
  itemId: string
  completed: boolean
}): Promise<{ checklistId: string }> {
  return callFunction('saveChecklistProgress', input)
}

/** Today's completion doc for one outlet+type — deterministic id, one-shot fetch (no live listener needed for a checklist someone is actively filling in on their own device). */
export function getTodaysChecklist(type: ChecklistType, outletId: string, date: string): Promise<ChecklistCompletion | null> {
  return getDocument<ChecklistCompletion>(COLLECTION_FOR_TYPE[type], `${outletId}__${date}`)
}
