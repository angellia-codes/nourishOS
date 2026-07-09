import {
  doc,
  onSnapshot,
  collection,
  query,
  type QueryConstraint,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

function mapSnap<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T
}

/**
 * Subscribes to a single document. Calls onChange(null) if the document
 * doesn't exist (e.g. deleted, or never created) rather than treating that
 * as onError — a missing doc is valid application state.
 */
export function subscribeToDocument<T>(
  collectionName: string,
  id: string,
  onChange: (data: T | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, collectionName, id),
    (snap) => onChange(snap.exists() ? mapSnap<T>(snap) : null),
    (error) => onError?.(error),
  )
}

export function subscribeToCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onChange: (data: T[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, collectionName), ...constraints),
    (snap) => onChange(snap.docs.map((d) => mapSnap<T>(d))),
    (error) => onError?.(error),
  )
}
