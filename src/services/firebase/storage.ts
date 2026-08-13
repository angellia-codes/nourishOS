import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { firebaseApp } from './app'
import { useFirebaseEmulator } from './config'

export const storage = getStorage(firebaseApp)

if (useFirebaseEmulator) {
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
