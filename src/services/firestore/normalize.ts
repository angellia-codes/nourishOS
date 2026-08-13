import { Timestamp } from 'firebase/firestore'

/**
 * Firestore hands back `Timestamp` instances, but every document type in
 * src/types models its date fields as ISO 8601 strings (BaseDocument.createdAt,
 * DATABASE.md §5). Normalising here — at the single read boundary — keeps
 * `firebase/firestore` types out of components, format helpers, and
 * src/utils/date.ts, which already accepts `string | Date`.
 *
 * Walks nested values because timestamps also live inside embedded maps and
 * arrays (EmployeeCompensation.updatedAt, approval step history).
 */
export function normalizeTimestamps(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(normalizeTimestamps)

  // Plain maps only. Firestore also returns GeoPoint / DocumentReference /
  // Bytes, which are class instances — those must pass through untouched
  // rather than being flattened into bare objects by the walk below.
  if (value !== null && typeof value === 'object' && (value as object).constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalizeTimestamps(nested)]),
    )
  }

  return value
}
