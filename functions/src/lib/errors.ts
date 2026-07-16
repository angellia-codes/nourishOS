import { HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

/**
 * The subset of Firebase callable error codes we actually use — API.md §26.
 * The client's callFunction() maps these to API_ERROR_CODE via
 * src/services/api/errors.ts; add codes there if you add one here.
 */
export type AppErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'failed-precondition'
  | 'resource-exhausted'
  | 'internal'
  | 'unavailable'

/**
 * Thrown by business logic for expected failures (validation, RBAC, state
 * preconditions). handleError() converts it to an HttpsError so the client
 * receives the code instead of a generic INTERNAL.
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly details?: unknown

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

/**
 * The single catch-block handler every callable uses. Expected failures
 * (AppError / HttpsError) pass through with their code; anything else is
 * logged with its stack and collapsed to a generic 'internal' so raw error
 * internals never leak to the client.
 */
export function handleError(error: unknown): never {
  if (error instanceof AppError) {
    throw new HttpsError(error.code, error.message, error.details)
  }
  if (error instanceof HttpsError) {
    throw error
  }
  logger.error('Unhandled error in Cloud Function', error)
  throw new HttpsError('internal', 'Something went wrong. Please try again.')
}
