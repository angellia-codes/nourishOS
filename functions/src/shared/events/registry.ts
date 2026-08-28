import { logger } from 'firebase-functions/v2'

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>

const handlers = new Map<string, EventHandler[]>()

/**
 * Generic cross-module event bus — near-copy of shared/approval/registry.ts's
 * Map-based dispatch, for the one case that isn't an approval resolution:
 * POSITIONS_MASTER_DESIGN.md §8.2's `PositionRevised` event. Positions emits
 * it after its own write; Appraisal registers a handler at module load. This
 * is what keeps the dependency arrow one-way (Positions has no knowledge
 * Appraisal exists) without either module reaching into the other's files or
 * misusing the approval-resolved registry for a non-approval concern.
 */
export function registerEventHandler(eventType: string, handler: EventHandler): void {
  const existing = handlers.get(eventType) ?? []
  existing.push(handler)
  handlers.set(eventType, existing)
}

/**
 * Awaits every registered handler but never lets one throw back to the
 * caller — a broken consumer must never fail the mutation that emitted the
 * event (same "stale is a warning" philosophy as §6.3).
 */
export async function emitEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
  const registered = handlers.get(eventType) ?? []
  await Promise.all(
    registered.map((handler) =>
      handler(payload).catch((error) => {
        logger.error(`Event handler for "${eventType}" failed`, error)
      }),
    ),
  )
}
