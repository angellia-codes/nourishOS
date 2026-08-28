import { onCall } from 'firebase-functions/v2/https'
import { REGION, requireActiveUser, requirePermission, AppError, handleError, successResponse, PERMISSIONS } from '../../lib'
import { buildExistingEquipmentIndex, issuePreviewToken, validateImportRows } from './helpers'

/**
 * equipment-master-design.md §4.2 phase 1 — parses, validates every row,
 * resolves insert/update branching, and writes nothing (AC #4). Returns the
 * full preview payload the three-tab UI (Inserts/Updates/Errors) renders.
 */
export const previewEquipmentImport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_IMPORT)

    const { rows } = (request.data ?? {}) as { rows?: Record<string, string>[] }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows is required and must be a non-empty array.')
    }

    const existing = await buildExistingEquipmentIndex()
    const result = validateImportRows(rows, existing)

    return successResponse(
      { previewToken: issuePreviewToken(), ...result },
      result.canCommit
        ? `${result.inserts.length} to insert, ${result.updates.length} to update. Ready to commit.`
        : `${result.errors.length} error(s) must be fixed before this file can be committed.`,
    )
  } catch (error) {
    return handleError(error)
  }
})
