/** API.md §7 — every Cloud Function that succeeds resolves with this envelope. */
export interface SuccessEnvelope<T> {
  success: true
  message: string
  data: T
}

/**
 * The only way a callable should return. The client's callFunction()
 * unwraps this shape and hands callers `data` directly.
 */
export function successResponse<T>(data: T, message = 'OK'): SuccessEnvelope<T> {
  return { success: true, message, data }
}
