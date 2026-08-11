import { callAction } from '@/services/appsScript/client'
import { toApiError } from './errors'

/**
 * Calls an Apps Script action and unwraps its envelope. Same contract as
 * before the migration off Firebase — callers still do
 * `callFunction<Response>('createEmployee', payload)` and get back `data`
 * or a thrown ApiError; only the transport underneath changed.
 */
export async function callFunction<TResponse = void, TRequest = Record<string, unknown>>(
  name: string,
  payload?: TRequest,
): Promise<TResponse> {
  try {
    return await callAction<TResponse, TRequest>(name, payload)
  } catch (error) {
    throw toApiError(error)
  }
}
