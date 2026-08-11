import { callAction } from '@/services/appsScript/client'
import { applyConstraints, type Constraint } from './constraints'

/**
 * Read layer, backed by Apps Script's coarse collection.get/collection.list
 * actions (apps-script/src/Api.js) instead of the Firestore SDK. Same
 * exported signatures as before the migration — callers are unchanged.
 */

/** Single document by ID. Returns null if it doesn't exist (not an error). */
export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  return callAction<T | null>('collection.get', { collection: collectionName, id })
}

/** One-shot query — use subscribeToCollection instead for anything that should update live. */
export async function queryDocuments<T>(
  collectionName: string,
  constraints: Constraint[] = [],
): Promise<T[]> {
  const docs = await callAction<T[]>('collection.list', { collection: collectionName })
  return applyConstraints(docs, constraints)
}
