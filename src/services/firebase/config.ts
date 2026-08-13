/**
 * Reads and validates Firebase env vars. Throws immediately on a missing
 * required var instead of letting Firebase fail later with an opaque
 * "invalid API key" error deep in the auth flow.
 */
const requiredVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(requiredVars)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length > 0) {
  throw new Error(
    `Missing required Firebase env vars: ${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill in your Firebase project config.`,
  )
}

export const firebaseConfig = {
  ...requiredVars,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
} as const

export const useFirebaseEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
