import type { ApiErrorCode } from '@/constants/statuses'

/** Source: API.md §7. */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  message: string
  data: T
}

/** Source: API.md §8. */
export interface ApiErrorResponse {
  success: false
  code: ApiErrorCode
  message: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
