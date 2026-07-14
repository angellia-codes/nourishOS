import { useEffect, useState } from 'react'
import type { QueryConstraint } from 'firebase/firestore'
import { subscribeToCollection } from '@/services/firestore'

interface UseFirestoreQueryState<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

/**
 * Real-time by default. `constraints` is rebuilt every render (a plain
 * array isn't a stable dependency), so the caller passes its own `deps`
 * array describing when the query should actually re-subscribe — e.g.
 * `useFirestoreQuery(COLLECTIONS.TASKS, [where('assignedTo','array-contains',uid)], [uid])`.
 * The lint rule can't verify `deps` matches what's used inside a
 * dynamically-built constraints array, so exhaustive-deps is intentionally
 * disabled here rather than worked around with something less honest.
 */
export function useFirestoreQuery<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  deps: unknown[] = [],
) {
  const [state, setState] = useState<UseFirestoreQueryState<T>>({ data: [], loading: true, error: null })

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    return subscribeToCollection<T>(
      collectionName,
      constraints,
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...deps])

  return state
}
