import { onCall } from 'firebase-functions/v2/https'
import { REGION, requireActiveUser, requirePermission, AppError, handleError, successResponse, PERMISSIONS } from '../../lib'
import { createEmployeeInternal, type CreateEmployeeInput } from './createEmployee'

const MAX_ROWS = 100

interface ImportRowResult {
  index: number
  success: boolean
  employeeId?: string
  employeeNumber?: string
  error?: string
}

/**
 * Bulk employee creation — HR_OPERATIONS.md §9.1-F12. Reuses
 * createEmployeeInternal's exact validation/allocation/write logic per row.
 * Partial success: a bad row (bad date, duplicate email, …) is recorded as a
 * failure and the batch keeps going, rather than the whole import failing on
 * the first bad row.
 */
export const importEmployees = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EMPLOYEES_CREATE)

    const { rows } = (request.data ?? {}) as { rows?: unknown }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows must be a non-empty array.')
    }
    if (rows.length > MAX_ROWS) {
      throw new AppError('invalid-argument', `A single import is limited to ${MAX_ROWS} rows.`)
    }

    const results: ImportRowResult[] = []
    for (let index = 0; index < rows.length; index++) {
      try {
        const { employeeId, employeeNumber } = await createEmployeeInternal(
          user,
          rows[index] as Partial<CreateEmployeeInput>,
        )
        results.push({ index, success: true, employeeId, employeeNumber })
      } catch (error) {
        results.push({ index, success: false, error: error instanceof Error ? error.message : 'Unknown error.' })
      }
    }

    const succeeded = results.filter((r) => r.success).length
    return successResponse({ results }, `Imported ${succeeded} of ${rows.length} employees.`)
  } catch (error) {
    handleError(error)
  }
})
