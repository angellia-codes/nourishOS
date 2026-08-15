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

  const [employees, sops, jobDescriptions, announcements, tasks] = await Promise.all([
    prefixQuery<Employee>(COLLECTIONS.EMPLOYEES, 'fullName', q),
    prefixQuery<Sop>(COLLECTIONS.SOPS, 'topic', q),
    prefixQuery<JobDescription>(COLLECTIONS.JOB_DESCRIPTIONS, 'title', q),
    prefixQuery<Announcement>(COLLECTIONS.ANNOUNCEMENTS, 'title', q),
    prefixQuery<Task>(COLLECTIONS.TASKS, 'title', q),
  ])

  return { employees, sops, jobDescriptions, announcements, tasks }
}
