import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { firebaseApp } from './app'
import { useFirebaseEmulator } from './config'

export const db = getFirestore(firebaseApp)

if (useFirebaseEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
