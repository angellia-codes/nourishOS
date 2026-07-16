import { FieldValue } from 'firebase-admin/firestore'

/**
 * The BaseDocument fields every new operational document carries
 * (DATABASE.md §5, mirrored client-side in src/types/firestore.types.ts).
 * Spread LAST in the .set() payload is fine — callers pass domain fields
 * first and these stamps close the object.
 */
export function newDocumentBaseFields(uid: string, status = 'active') {
  return {
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    status,
    isArchived: false,
  }
}

/** Spread into every .update() so updatedAt/updatedBy can never be forgotten. */
export function updatedFields(uid: string) {
  return {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }
}
