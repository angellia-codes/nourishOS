import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { firebaseConfig } from './config'

/**
 * Vite HMR can re-execute this module without a full page reload;
 * getApps().length guards against "Firebase app already exists" errors.
 */
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
