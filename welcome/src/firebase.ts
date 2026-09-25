import { initializeApp } from 'firebase/app'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'

/**
 * Callables only. A new hire has no Firebase Auth session and reads no
 * Firestore document directly — `firestore.rules` denies `onboardingInvites`
 * to every client outright — so every byte in and out goes through
 * functions/src/hr/welcome/portal/*.
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

// DEV-only: a production build must never be pointed at 127.0.0.1, whatever
// the deployment's env vars say. The candidate portal shipped that way once
// and read as "no open positions" rather than as a failure.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

/** Carries the per-field detail submitWelcomeForm returns (§11). */
export interface FieldIssue {
  field: string
  message: string
}

export class WelcomeError extends Error {
  readonly issues: FieldIssue[]

  constructor(message: string, issues: FieldIssue[] = []) {
    super(message)
    this.name = 'WelcomeError'
    this.issues = issues
  }
}

/**
 * Same contract as portal/src/firebase.ts — a deliberate ~20-line copy rather
 * than an import, because this is a separate app and must not reach into
 * NourishOS's service layer.
 *
 * The one addition: `details.issues` / `details.rejected` are unwrapped, so a
 * caller can highlight the offending fields instead of showing one message.
 */
export async function callFunction<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    const result = await httpsCallable<Record<string, unknown>, { success: boolean; data: T; message?: string }>(
      functions,
      name,
    )(payload)
    return result.data.data
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    const clean = raw.replace(/^(FirebaseError|internal|functions\/[a-z-]+):?\s*/i, '').trim()
    const details = (error as { details?: { issues?: FieldIssue[]; rejected?: FieldIssue[] } })?.details
    throw new WelcomeError(clean || 'Something went wrong. Please try again.', details?.issues ?? details?.rejected ?? [])
  }
}
