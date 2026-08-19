import { callFunction } from '@/services/api'
import { getDocument, queryDocuments, subscribeToCollection, where, orderBy } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Unsubscribe } from '@/services/firestore'
import type {
  AcknowledgementStatus,
  DisciplinaryRecord,
  ProposedActionCategory,
  SignatureMethod,
} from '@/types'
import type { DisciplinaryType } from '@/constants/hr'

/**
 * Employee Communication records — employee_communication.md. Writes are thin
 * `callFunction` wrappers; reads go straight to Firestore, as everywhere else.
 *
 * The collection is `disciplinaryActions`: this feature extended HR's existing
 * disciplinary record rather than adding the spec's separate
 * `communicationRecords` collection, so HR never files the same SP1 twice.
 */

export interface CommunicationFormInput {
  type: DisciplinaryType
  description: string
  incident: {
    date?: string
    time?: string
    location?: string
    details?: string
    policyReference?: string
    codeOfConductReference?: string
  }
  proposedAction: {
    category?: ProposedActionCategory
    description?: string
    owner?: string
    targetDate?: string
  }
  furtherAction: {
    employer?: string
    employerOwner?: string
    employerDate?: string
    employee?: string
    employeeDueDate?: string
  }
  repeatIncident: {
    consequence?: string
    nextExpectedAction?: DisciplinaryType
    linkedPreviousRecordId?: string
  }
  /** Omit to take the type's default window; null for no expiry. */
  validityDays?: number | null
}

export function createCommunicationRecord(
  input: CommunicationFormInput & { employeeId: string },
): Promise<{ recordId: string }> {
  return callFunction('createDisciplinaryRecord', input)
}

export function updateCommunicationRecord(
  input: CommunicationFormInput & { recordId: string },
): Promise<{ recordId: string }> {
  return callFunction('updateDisciplinaryRecord', input)
}

export function submitCommunicationRecord(
  recordId: string,
): Promise<{ recordId: string; approvalRequestId: string }> {
  return callFunction('submitCommunicationRecord', { recordId })
}

export function submitEmployeeStatement(input: { recordId: string; text: string }): Promise<{ recordId: string }> {
  return callFunction('submitEmployeeStatement', input)
}

export function acknowledgeCommunicationRecord(input: {
  recordId: string
  acknowledgementStatus: Exclude<AcknowledgementStatus, 'pending'>
  method?: SignatureMethod
  signedName?: string
  /** Required by the server for anything other than a plain acknowledgement (§35 Rule 7). */
  circumstances?: string
}): Promise<{ recordId: string; validFrom: string; validUntil: string | null }> {
  return callFunction('acknowledgeCommunicationRecord', input)
}

export function addInvestigationNote(input: { recordId: string; note: string }): Promise<{ recordId: string }> {
  return callFunction('addInvestigationNote', input)
}

export function closeCommunicationRecord(input: {
  recordId: string
  closureReason?: string
}): Promise<{ recordId: string }> {
  return callFunction('closeDisciplinaryRecord', input)
}

export function getCommunicationRecord(recordId: string): Promise<DisciplinaryRecord | null> {
  return getDocument<DisciplinaryRecord>(COLLECTIONS.DISCIPLINARY_ACTIONS, recordId)
}

/** One-shot — the employee profile's "Disciplinary Records" card doesn't need a live listener. */
export function listCommunicationRecords(employeeId: string): Promise<DisciplinaryRecord[]> {
  return queryDocuments<DisciplinaryRecord>(COLLECTIONS.DISCIPLINARY_ACTIONS, [
    where('employeeId', '==', employeeId),
    orderBy('createdAt', 'desc'),
  ])
}

/**
 * Which slice of the register the caller may read — one per readable branch of
 * the `disciplinaryActions` rule. A list query fails in its entirety if a single
 * returned document fails its own read rule, so the caller picks a branch by
 * role rather than fetching broadly and filtering client-side.
 */
export type CommunicationScope =
  | { kind: 'all' }
  | { kind: 'department'; departmentId: string }
  | { kind: 'employee'; uid: string }

export function subscribeToCommunicationRecords(
  scope: CommunicationScope,
  onChange: (rows: DisciplinaryRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const constraints =
    scope.kind === 'all'
      ? [orderBy('createdAt', 'desc')]
      : scope.kind === 'department'
        ? [where('departmentId', '==', scope.departmentId), orderBy('createdAt', 'desc')]
        : [where('employeeUid', '==', scope.uid), orderBy('createdAt', 'desc')]

  return subscribeToCollection<DisciplinaryRecord>(
    COLLECTIONS.DISCIPLINARY_ACTIONS,
    constraints,
    onChange,
    onError,
  )
}
