# firestore

Read-only Firestore service layer: `getDocument`, `queryDocuments`, `subscribeToDocument`, `subscribeToCollection`. No writes here — writes go through `services/api` + a Cloud Function. See queries.ts for the full rationale.
