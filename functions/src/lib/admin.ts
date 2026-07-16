import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Guarded so emulator hot-reloads / test imports can't double-initialize.
if (getApps().length === 0) {
  initializeApp()
}

export const db = getFirestore()
export const authAdmin = getAuth()

/**
 * asia-southeast2 (Jakarta) — closest to Nourish's outlets. Must match the
 * region the client SDK targets in src/services/firebase/functions.ts, or
 * every callable fails with NOT_FOUND. Change both together or neither.
 */
export const REGION = 'asia-southeast2'
