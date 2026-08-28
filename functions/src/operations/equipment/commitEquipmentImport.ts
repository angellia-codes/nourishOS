import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from '../../lib'
import {
  allocateEquipmentAssetCodes,
  assertPreviewTokenFresh,
  buildExistingEquipmentIndex,
  validateImportRows,
  type EquipmentImportRow,
} from './helpers'

/** Firestore's hard 500-write batch limit — chunked well under it (§4.2). */
const BATCH_CHUNK_SIZE = 450

function insertFields(row: EquipmentImportRow) {
  return {
    name: row.name,
    category: row.category,
    equipmentType: row.equipmentType,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serialNumber,
    outletId: row.outletId,
    area: row.area,
    locationDetail: row.locationDetail,
    departmentId: row.departmentId,
    criticality: row.criticality,
    criticalityOverridden: row.criticalityOverridden,
    installDate: row.installDate,
    warrantyExpiryDate: row.warrantyExpiryDate,
    serviceVendorName: row.serviceVendorName,
    notes: row.notes,
  }
}

/**
 * equipment-master-design.md §4.2 phase 2 — re-validates every row from
 * scratch against a freshly-read register (never trusts the client's cached
 * preview), refuses to write anything if a single error remains (AC #5), and
 * chunks the actual writes to stay under Firestore's 500-write batch cap
 * (AC #6). One run-level audit entry plus one per created/updated record
 * (§4.8) — not one run-level entry per row, which would bury the audit log
 * on a 200-row import.
 */
export const commitEquipmentImport = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requirePermission(user, PERMISSIONS.EQUIPMENT_IMPORT)

    const { previewToken, rows, fileName } = (request.data ?? {}) as {
      previewToken?: string
      rows?: Record<string, string>[]
      fileName?: string
    }
    assertPreviewTokenFresh(previewToken)
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('invalid-argument', 'rows is required and must be a non-empty array.')
    }

    const existing = await buildExistingEquipmentIndex()
    const result = validateImportRows(rows, existing)
    if (!result.canCommit) {
      throw new AppError(
        'failed-precondition',
        `${result.errors.length} error(s) remain in this file — nothing was written. Re-run the preview after fixing them.`,
      )
    }

    const assetCodes = await allocateEquipmentAssetCodes(
      result.inserts.map((row) => ({ outletId: row.outletId, category: row.category })),
    )

    const insertRefs = result.inserts.map(() => db.collection(COLLECTIONS.EQUIPMENT).doc())
    const updateRefs = result.updates.map((row) => db.collection(COLLECTIONS.EQUIPMENT).doc(row.equipmentId))

    const writes: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [
      ...result.inserts.map((row, index) => ({
        ref: insertRefs[index],
        data: {
          assetCode: assetCodes[index],
          ...insertFields(row),
          decommissionedAt: null,
          decommissionedBy: null,
          decommissionReason: null,
          decommissionApprovalRequestId: null,
          photoFileId: null,
          ...newDocumentBaseFields(user.uid),
        },
      })),
      ...result.updates.map((row, index) => ({
        ref: updateRefs[index],
        data: { ...insertFields(row), ...updatedFields(user.uid) },
      })),
    ]

    for (let i = 0; i < writes.length; i += BATCH_CHUNK_SIZE) {
      const batch = db.batch()
      for (const { ref, data } of writes.slice(i, i + BATCH_CHUNK_SIZE)) {
        batch.set(ref, data, { merge: true })
      }
      await batch.commit()
    }

    await recordAuditEvent({
      eventType: 'EquipmentImportCommitted',
      category: 'Engineering',
      module: 'operations',
      resourceType: 'equipment',
      resourceId: 'import',
      action: 'import',
      user,
      metadata: {
        fileName: fileName ?? null,
        insertCount: result.inserts.length,
        updateCount: result.updates.length,
      },
    })

    await Promise.all([
      ...result.inserts.map((row, index) =>
        recordAuditEvent({
          eventType: 'EquipmentCreated',
          category: 'Engineering',
          module: 'operations',
          resourceType: 'equipment',
          resourceId: insertRefs[index].id,
          action: 'create',
          user,
          newValues: { assetCode: assetCodes[index], ...insertFields(row) },
          metadata: { source: 'import' },
        }),
      ),
      ...result.updates.map((row, index) =>
        recordAuditEvent({
          eventType: 'EquipmentUpdated',
          category: 'Engineering',
          module: 'operations',
          resourceType: 'equipment',
          resourceId: updateRefs[index].id,
          action: 'update',
          user,
          newValues: insertFields(row),
          metadata: { source: 'import', changedFields: row.changedFields },
        }),
      ),
    ])

    return successResponse(
      { insertCount: result.inserts.length, updateCount: result.updates.length },
      `${result.inserts.length} inserted, ${result.updates.length} updated.`,
    )
  } catch (error) {
    return handleError(error)
  }
})
