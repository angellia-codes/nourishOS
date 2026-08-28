import { queryDocuments, where, orderBy, limit } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { Employee, Sop, JobDescription, Announcement, Task } from '@/types'

export interface SearchResults {
  employees: Employee[]
  sops: Sop[]
  jobDescriptions: JobDescription[]
  announcements: Announcement[]
  tasks: Task[]
}

/** Firestore has no full-text search — a range query bounded by the next codepoint is the standard prefix-match trick. */
const PREFIX_UPPER_BOUND = String.fromCharCode(0xf8ff)

const CACHE_TTL_MS = 60_000

/**
 * Keyed on the exact trimmed query text (case-sensitive, matching the
 * underlying Firestore range query) so re-running the same search within
 * CACHE_TTL_MS skips all 5 reads. ponytail: no size cap or sweep — a session
 * would need many hundreds of distinct terms before this is a real memory
 * concern; add an evict-oldest-on-size-cap if that ever changes.
 */
const cache = new Map<string, { results: SearchResults; expiresAt: number }>()

/**
 * Five independent prefix queries, each wrapped so a collection the caller
 * can't read (rules-denied) just contributes zero results instead of
 * failing the whole search. Work Orders isn't included yet (built same
 * pass, not indexed here); "Reports" from the spec's list are aggregation
 * pages, not records.
 */
async function prefixQuery<T>(collectionName: string, field: string, queryText: string): Promise<T[]> {
  try {
    return await queryDocuments<T>(collectionName, [
      where(field, '>=', queryText),
      where(field, '<=', queryText + PREFIX_UPPER_BOUND),
      orderBy(field),
      limit(10),
    ])
  } catch {
    return []
  }
}

export async function searchAll(queryText: string): Promise<SearchResults> {
  const q = queryText.trim()
  if (!q) {
    return { employees: [], sops: [], jobDescriptions: [], announcements: [], tasks: [] }
  }

  const cached = cache.get(q)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results
  }

  const [employees, sops, jobDescriptions, announcements, tasks] = await Promise.all([
    prefixQuery<Employee>(COLLECTIONS.EMPLOYEES, 'fullName', q),
    prefixQuery<Sop>(COLLECTIONS.SOPS, 'topic', q),
    prefixQuery<JobDescription>(COLLECTIONS.JOB_DESCRIPTIONS, 'title', q),
    prefixQuery<Announcement>(COLLECTIONS.ANNOUNCEMENTS, 'title', q),
    prefixQuery<Task>(COLLECTIONS.TASKS, 'title', q),
  ])

  const results = { employees, sops, jobDescriptions, announcements, tasks }
  cache.set(q, { results, expiresAt: Date.now() + CACHE_TTL_MS })
  return results
}
