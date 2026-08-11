import { API_ERROR_CODE, type ApiErrorCode } from '@/constants/statuses'
import { AppsScriptError } from '@/services/appsScript/client'

/**
 * Thrown by callFunction() on any Apps Script action failure. Callers catch
 * this — never the raw AppsScriptError — so error handling stays consistent
 * whether the failure came from validation, RBAC, or a bug.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly details?: unknown

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

/** Apps Script's AppErrorCode (apps-script/src/Errors.js) is kebab-case; API.md §26 is upper-snake. */
const APPS_SCRIPT_TO_API_CODE: Record<string, ApiErrorCode> = {
  'invalid-argument': API_ERROR_CODE.INVALID_ARGUMENT,
  unauthenticated: API_ERROR_CODE.UNAUTHENTICATED,
  'permission-denied': API_ERROR_CODE.PERMISSION_DENIED,
  'not-found': API_ERROR_CODE.NOT_FOUND,
  'already-exists': API_ERROR_CODE.ALREADY_EXISTS,
  'failed-precondition': API_ERROR_CODE.FAILED_PRECONDITION,
  'resource-exhausted': API_ERROR_CODE.RESOURCE_EXHAUSTED,
  internal: API_ERROR_CODE.INTERNAL,
  unavailable: API_ERROR_CODE.UNAVAILABLE,
}

/** Converts whatever the transport throws into our ApiError. Never throws itself. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof AppsScriptError) {
    const code = APPS_SCRIPT_TO_API_CODE[error.code] ?? API_ERROR_CODE.INTERNAL
    return new ApiError(code, error.message, error.details)
  }

  if (error instanceof Error) {
    return new ApiError(API_ERROR_CODE.INTERNAL, error.message)
  }

  return new ApiError(API_ERROR_CODE.INTERNAL, 'An unknown error occurred.')
}
