import { onCall } from 'firebase-functions/v2/https'
import { db, COLLECTIONS, REGION, requireActiveUser, recordAuditEvent, updatedFields, AppError, handleError, successResponse } from '../../lib'

const OVERRIDE_ROLES = ['superAdmin', 'director', 'generalManager']

export const deleteFile = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const { fileId } = (request.data ?? {}) as { fileId?: string }

    if (!fileId) {
      throw new AppError('invalid-argument', 'fileId is required.')
    }

    const fileRef = db.collection(COLLECTIONS.FILES).doc(fileId)
    const fileSnap = await fileRef.get()
    if (!fileSnap.exists) {
      throw new AppError('not-found', 'File not found.')
    }
    const fileData = fileSnap.data()!

    const isOwner = fileData.createdBy === user.uid
    if (!isOwner && !OVERRIDE_ROLES.includes(user.roleId)) {
      throw new AppError('permission-denied', 'You do not have permission to remove this file.')
    }

    // Soft delete only — the Storage object stays until the retention
    // policy job (file_storage.md §24/§25) permanently removes it. That
    // job doesn't exist yet; flagging rather than building it speculatively.
    await fileRef.update({ fileStatus: 'deleted', ...updatedFields(user.uid) })

    await recordAuditEvent({
      eventType: 'FileDeleted',
      category: 'Files',
      module: fileData.module,
      resourceType: fileData.resourceType,
      resourceId: fileData.resourceId,
      action: 'delete',
      user,
      metadata: { fileId },
    })

    return successResponse(undefined, 'File removed.')
  } catch (error) {
    handleError(error)
  }
})
