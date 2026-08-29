import { onCall } from 'firebase-functions/v2/https'
import { REGION, requireActiveUser, requirePermission, AppError, handleError, successResponse, PERMISSIONS } from '../../lib'
import { createEmployeeInternal, type CreateEmployeeInput } from './createEmployee'
import { setEmployeeCompensationInternal, type CompensationInput } from './updateEmployeeCompensation'

const MAX_ROWS = 100

interface ImportRow {
  employee: Partial<CreateEmployeeInput>
  compensation?: Partial<CompensationInput>
}

interface ImportRowResult {
  index: number
  success: boolean
  employeeId?: string
  employeeNumber?: string
  error?: string
  /** Employee was created but its compensation row failed to write (bad number, etc.) — not fatal to the row. */
  compensationError?: string
}

/**
 * Bulk employee creation — HR_OPERATIONS.md §9.1-F12. Reuses
 * createEmployeeInternal's exact validation/allocation/write logic per row.
 * Partial success: a bad row (bad date, duplicate email, …) is recorded as a
 * failure and the batch keeps going, rather than the whole import failing on
 * the first bad row.
 *
 * Compensation is optional per row (2026-08-29). Its permission check is
 * upfront and fatal for the WHOLE import, not per-row or silently skipped —
 * requirePermission is this codebase's only permission-check shape and it is
 * always called once, synchronously, before any work; a bulk write of
 * salary/bank data is exactly the kind of thing that should fail loud if the
 * caller lacks employees.readSensitive, not partially succeed.
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

    const typedRows = rows as ImportRow[]
    if (typedRows.some((row) => row.compensation !== undefined)) {
      requirePermission(user, PERMISSIONS.EMPLOYEES_READ_SENSITIVE)
    }

    const results: ImportRowResult[] = []
    for (let index = 0; index < typedRows.length; index++) {
      const row = typedRows[index]
      try {
        const { employeeId, employeeNumber } = await createEmployeeInternal(user, row.employee)
        const result: ImportRowResult = { index, success: true, employeeId, employeeNumber }

        if (row.compensation) {
          try {
            await setEmployeeCompensationInternal(user, employeeId, row.compensation)
          } catch (compError) {
            result.compensationError = compError instanceof Error ? compError.message : 'Unknown error.'
          }
        }

        results.push(result)
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
