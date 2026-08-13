import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth'
import { firebaseApp } from './app'
import { useFirebaseEmulator } from './config'

export const auth = getAuth(firebaseApp)

/** Google Sign-In is the only supported provider per AUTHENTICATION.md §3. */
export const googleProvider = new GoogleAuthProvider()

if (useFirebaseEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
