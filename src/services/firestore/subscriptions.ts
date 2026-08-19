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
import { normalizeTimestamps } from './normalize'

function mapSnap<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...(normalizeTimestamps(snap.data()) as Record<string, unknown>) } as T
}

/**
 * Defers teardown by one macrotask.
 *
 * React StrictMode mounts every effect twice in development: subscribe →
 * cleanup → subscribe. Tearing the listener down synchronously means the same
 * listen target is removed and re-added within one tick, and firebase-js-sdk
 * 11.10.0 mis-accounts that — every listener then dies with
 * "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)" ({"ve":-1}, the
 * target's outstanding-response count going negative), which takes the whole
 * Firestore client with it and leaves every subscribed page rendering the
 * router error boundary. Letting the second subscription start before the first
 * one is dropped keeps the target alive throughout, so the SDK just refcounts
 * it. On a real unmount this only delays cleanup by a tick.
 */
function deferUnsubscribe(unsubscribe: Unsubscribe): Unsubscribe {
  return () => {
    setTimeout(unsubscribe, 0)
  }
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
  return deferUnsubscribe(
    onSnapshot(
      doc(db, collectionName, id),
      (snap) => onChange(snap.exists() ? mapSnap<T>(snap) : null),
      (error) => onError?.(error),
    ),
  )
}

export function subscribeToCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onChange: (data: T[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return deferUnsubscribe(
    onSnapshot(
      query(collection(db, collectionName), ...constraints),
      (snap) => onChange(snap.docs.map((d) => mapSnap<T>(d))),
      (error) => onError?.(error),
    ),
  )
}
