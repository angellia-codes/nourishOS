import { callAction } from '@/services/appsScript/client'
import { applyConstraints, type Constraint, type Unsubscribe } from './constraints'

/**
 * Realtime-shaped API kept for callers, backed by polling — Apps Script has
 * no onSnapshot equivalent (accepted tradeoff, see the migration plan).
 * Each subscription polls independently; interval is deliberately not
 * configurable per call site yet (ponytail: add a param when some screen
 * actually needs faster-than-10s feedback, not before).
 */
const POLL_INTERVAL_MS = 10_000

export function subscribeToDocument<T>(
  collectionName: string,
  id: string,
  onChange: (data: T | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let lastJson: string | undefined
  let cancelled = false

  const tick = async () => {
    try {
      const doc = await callAction<T | null>('collection.get', { collection: collectionName, id })
      if (cancelled) return
      const json = JSON.stringify(doc)
      if (json !== lastJson) {
        lastJson = json
        onChange(doc)
      }
    } catch (error) {
      if (!cancelled) onError?.(error as Error)
    }
  }

  void tick()
  const intervalId = setInterval(tick, POLL_INTERVAL_MS)
  return () => {
    cancelled = true
    clearInterval(intervalId)
  }
}

export function subscribeToCollection<T>(
  collectionName: string,
  constraints: Constraint[],
  onChange: (data: T[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let lastJson: string | undefined
  let cancelled = false

  const tick = async () => {
    try {
      const docs = await callAction<T[]>('collection.list', { collection: collectionName })
      if (cancelled) return
      const filtered = applyConstraints(docs, constraints)
      const json = JSON.stringify(filtered)
      if (json !== lastJson) {
        lastJson = json
        onChange(filtered)
      }
    } catch (error) {
      if (!cancelled) onError?.(error as Error)
    }
  }

  void tick()
  const intervalId = setInterval(tick, POLL_INTERVAL_MS)
  return () => {
    cancelled = true
    clearInterval(intervalId)
  }
}
