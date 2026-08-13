import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { firebaseApp } from './app'
import { useFirebaseEmulator } from './config'

/**
 * Region set to asia-southeast2 (Jakarta) — closest to Nourish's outlets.
 * This must match wherever functions are actually deployed (see
 * functions/ config in Milestone 3) or calls will fail with NOT_FOUND.
 * Confirm before first deploy — this is the one place it should change.
 */
export const functions = getFunctions(firebaseApp, 'asia-southeast2')

if (useFirebaseEmulator) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
