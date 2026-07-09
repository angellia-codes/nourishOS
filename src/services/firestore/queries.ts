import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  type QueryConstraint,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

/**
 * Firestore READ layer.
 *
 * IMPORTANT: This module intentionally exposes no create/update/delete
 * functions. Per ARCHITECTURE.md's layering rule and API.md §3 ("Sensitive
 * operations must always execute through Cloud Functions"), all writes go
 * through services/api/callFunction + a named Cloud Function. Reading
 * directly from Firestore (governed by Security Rules) is fine and is the
 * documented pattern — API.md §19 "Firestore Read Services."
 */

function mapSnap<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T
}

/** Single document by ID. Returns null if it doesn't exist (not an error). */
export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id))
  return snap.exists() ? mapSnap<T>(snap) : null
}

/** One-shot query — use subscribeToCollection instead for anything that should update live. */
export async function queryDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints))
  return snap.docs.map((d) => mapSnap<T>(d))
}
