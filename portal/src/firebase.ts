import { initializeApp } from 'firebase/app'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'

/**
 * Callables only. The portal has no Firebase Auth session and reads no
 * Firestore document directly — `firestore.rules` would deny it anyway — so
 * every byte in and out goes through functions/src/recruitment/portal/*.
 *
 * Region must match functions/src/lib/admin.ts, or every call is NOT_FOUND.
 */
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

const functions = getFunctions(app, 'asia-southeast2')

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

/**
 * Same contract as src/services/api/callFunction.ts — a deliberate ~15-line
 * copy rather than an import, because the portal is a separate app and must not
 * reach into NourishOS's service layer.
 */
export async function callFunction<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    const result = await httpsCallable<Record<string, unknown>, { success: boolean; data: T; message?: string }>(
      functions,
      name,
    )(payload)
    return result.data.data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    throw new Error(message.replace(/^(FirebaseError|internal|functions\/[a-z-]+):?\s*/i, ''))
  }
}
