import { useCallback, useState } from 'react'

interface UseAsyncState<TResult> {
  data: TResult | null
  loading: boolean
  error: Error | null
}

/**
 * Wraps any async function (typically a services/api or services/shared
 * call) with standard loading/error/data state. `asyncFn` should be stable
 * across renders (wrap it in useCallback at the call site, or pass a
 * module-level function reference) — this hook re-creates `execute`
 * whenever `asyncFn` changes identity.
 *
 * Deliberately does not cache or dedupe requests — this is a thin
 * loading/error wrapper, not a data-fetching library. Use
 * useFirestoreDoc/useFirestoreQuery for reads; this is for actions
 * (submit, generate, delete...).
 */
export function useAsync<TArgs extends unknown[], TResult>(asyncFn: (...args: TArgs) => Promise<TResult>) {
  const [state, setState] = useState<UseAsyncState<TResult>>({ data: null, loading: false, error: null })

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setState({ data: null, loading: true, error: null })
      try {
        const result = await asyncFn(...args)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unexpected error occurred.')
        setState({ data: null, loading: false, error })
        throw error
      }
    },
    [asyncFn],
  )

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), [])

  return { ...state, execute, reset }
}
