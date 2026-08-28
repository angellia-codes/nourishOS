import { callFunction } from '@/services/api'
import { getDocument, subscribeToCollection, orderBy, where, type Unsubscribe } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { DocumentResource } from '@/types'

/** Company Forms uses this service (one collection-picking Cloud Function set) — see functions/src/documents/resources.ts. */
export type DocumentResourceKind = 'form'

const COLLECTION_FOR_KIND: Record<DocumentResourceKind, string> = {
  form: COLLECTIONS.COMPANY_FORMS,
}

export interface DocumentResourceInput {
  title: string
  category: string
  driveUrl: string
}

export function createDocumentResource(
  kind: DocumentResourceKind,
  input: DocumentResourceInput,
): Promise<{ resourceId: string }> {
  return callFunction('createDocumentResource', { resourceKind: kind, ...input })
}

export function updateDocumentResource(
  kind: DocumentResourceKind,
  resourceId: string,
  input: DocumentResourceInput,
): Promise<{ resourceId: string }> {
  return callFunction('updateDocumentResource', { resourceKind: kind, resourceId, ...input })
}

export function deleteDocumentResource(kind: DocumentResourceKind, resourceId: string): Promise<{ resourceId: string }> {
  return callFunction('deleteDocumentResource', { resourceKind: kind, resourceId })
}

export function getDocumentResource(kind: DocumentResourceKind, resourceId: string): Promise<DocumentResource | null> {
  return getDocument<DocumentResource>(COLLECTION_FOR_KIND[kind], resourceId)
}

export function subscribeToDocumentResources(
  kind: DocumentResourceKind,
  onChange: (rows: DocumentResource[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<DocumentResource>(
    COLLECTION_FOR_KIND[kind],
    [where('isArchived', '==', false), orderBy('title')],
    onChange,
    onError,
  )
}
