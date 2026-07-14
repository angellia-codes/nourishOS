import { useEffect, useState } from 'react'
import { subscribeToDocument } from '@/services/firestore'

interface UseFirestoreDocState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Real-time by default — matches the "real-time collaboration" principle
 * in ARCHITECTURE.md §20. Pass a falsy `id` to skip subscribing (e.g. a
 * detail page rendered before its route param resolves); this is not an
 * error state, just an idle one.
 */
export function useFirestoreDoc<T>(collectionName: string, id: string | undefined | null) {
  const [state, setState] = useState<UseFirestoreDocState<T>>({ data: null, loading: Boolean(id), error: null })

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    return subscribeToDocument<T>(
      collectionName,
      id,
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    )
  }, [collectionName, id])

  return state
}
