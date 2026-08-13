export { getDocument, queryDocuments } from './queries'
export { subscribeToDocument, subscribeToCollection } from './subscriptions'
export { normalizeTimestamps } from './normalize'
// Re-export commonly needed query-building primitives so features don't
// need a separate `import { where, orderBy } from 'firebase/firestore'`.
export { where, orderBy, limit, type QueryConstraint, type Unsubscribe } from 'firebase/firestore'
