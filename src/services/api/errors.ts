import { FunctionsErrorCode } from 'firebase/functions'
import { API_ERROR_CODE, type ApiErrorCode } from '@/constants/statuses'

/**
 * Thrown by callFunction() on any Cloud Function failure. Callers catch
 * this — never the raw Firebase FunctionsError — so error handling stays
 * consistent whether the failure came from validation, RBAC, or a bug.
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

/**
 * Firebase's callable error codes don't line up 1:1 with API.md §26's set.
 * This is the reconciliation table — deliberate, not arbitrary.
 */
const FIREBASE_TO_API_CODE: Record<FunctionsErrorCode, ApiErrorCode> = {
  'functions/invalid-argument': API_ERROR_CODE.INVALID_ARGUMENT,
  'functions/unauthenticated': API_ERROR_CODE.UNAUTHENTICATED,
  'functions/permission-denied': API_ERROR_CODE.PERMISSION_DENIED,
  'functions/not-found': API_ERROR_CODE.NOT_FOUND,
  'functions/already-exists': API_ERROR_CODE.ALREADY_EXISTS,
  'functions/failed-precondition': API_ERROR_CODE.FAILED_PRECONDITION,
  'functions/resource-exhausted': API_ERROR_CODE.RESOURCE_EXHAUSTED,
  'functions/internal': API_ERROR_CODE.INTERNAL,
  'functions/unavailable': API_ERROR_CODE.UNAVAILABLE,
  // Codes with no clean API.md equivalent collapse to the closest match.
  'functions/cancelled': API_ERROR_CODE.INTERNAL,
  'functions/unknown': API_ERROR_CODE.INTERNAL,
  'functions/deadline-exceeded': API_ERROR_CODE.UNAVAILABLE,
  'functions/out-of-range': API_ERROR_CODE.INVALID_ARGUMENT,
  'functions/unimplemented': API_ERROR_CODE.INTERNAL,
  'functions/data-loss': API_ERROR_CODE.INTERNAL,
  'functions/aborted': API_ERROR_CODE.FAILED_PRECONDITION,
  'functions/ok': API_ERROR_CODE.INTERNAL,
}

/** Converts whatever the Firebase SDK throws into our ApiError. Never throws itself. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isFirebaseFunctionsError(error)) {
    const code = FIREBASE_TO_API_CODE[error.code] ?? API_ERROR_CODE.INTERNAL
    return new ApiError(code, error.message, error.details)
  }

  if (error instanceof Error) {
    return new ApiError(API_ERROR_CODE.INTERNAL, error.message)
  }

  return new ApiError(API_ERROR_CODE.INTERNAL, 'An unknown error occurred.')
}

function isFirebaseFunctionsError(
  error: unknown,
): error is { code: FunctionsErrorCode; message: string; details?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}
