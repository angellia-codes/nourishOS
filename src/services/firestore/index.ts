export { getDocument, queryDocuments } from './queries'
export { subscribeToDocument, subscribeToCollection } from './subscriptions'
// Re-export commonly needed query-building primitives so features don't
// need a separate `import { where, orderBy } from 'firebase/firestore'`.
export { where, orderBy, limit, type QueryConstraint } from 'firebase/firestore'
