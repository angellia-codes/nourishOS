import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import { ApiError, toApiError } from './errors'
import { API_ERROR_CODE } from '@/constants/statuses'

/** Matches API.md §7 — every Cloud Function that succeeds resolves with this shape. */
interface SuccessEnvelope<T> {
  success: true
  message: string
  data: T
}

/**
 * Calls a Cloud Function and unwraps the response envelope.
 *
 * Failure handling note: API.md §8 shows failures as a resolved
 * `{success:false, code, message}` value, but idiomatic Firebase Callable
 * Functions throw (via HttpsError) and reject the promise instead — that
 * gets proper error codes, stack traces, and Cloud Logging integration for
 * free. Our Cloud Functions throw HttpsError on failure and only return
 * the envelope on success; this wrapper normalizes both paths to either a
 * resolved TResponse or a thrown ApiError, so callers never touch Firebase
 * SDK types directly.
 */
export async function callFunction<TResponse = void, TRequest = Record<string, unknown>>(
  name: string,
  payload?: TRequest,
): Promise<TResponse> {
  try {
    const callable = httpsCallable<TRequest | undefined, SuccessEnvelope<TResponse>>(functions, name)
    const result = await callable(payload)

    if (!result.data?.success) {
      // Defensive — our functions should never resolve with success:false,
      // but don't silently treat it as a valid response if they do.
      throw new ApiError(API_ERROR_CODE.INTERNAL, 'Function returned an unexpected response shape.')
    }

    return result.data.data
  } catch (error) {
    throw toApiError(error)
  }
}
