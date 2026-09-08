import { useMemo } from 'react'
import { useToastStore } from '@/store'

/**
 * The returned object MUST keep a stable identity across renders. It is listed
 * in the dependency array of the record-loading effect on every edit form in
 * this app, so a fresh object literal per render re-runs those effects after
 * every render: the form re-fetches and re-seeds its own state from the server,
 * wiping whatever the user just picked, in an unbounded loop. That shipped as
 * "the size dropdown always jumps back to the first size" on Receive Stock.
 *
 * addToast comes from the Zustand store's creator and is stable for the
 * lifetime of the store, so the memo never actually recomputes.
 */
export function useToast() {
  const addToast = useToastStore((s) => s.addToast)

  return useMemo(
    () => ({
      success: (message: string) => addToast('success', message),
      error: (message: string) => addToast('error', message),
      warning: (message: string) => addToast('warning', message),
      info: (message: string) => addToast('info', message),
    }),
    [addToast],
  )
}
