import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../../lib'
import { validateFile } from './validation'

interface CreateFileMetadataInput {
  storagePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  module: string
  resourceType: string
  resourceId: string
}

export const createFileMetadata = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    const input = (request.data ?? {}) as Partial<CreateFileMetadataInput>

    if (
      !input.storagePath ||
      !input.fileName ||
      !input.mimeType ||
      !input.fileSizeBytes ||
      !input.module ||
      !input.resourceType ||
      !input.resourceId
    ) {
      throw new AppError(
        'invalid-argument',
        'storagePath, fileName, mimeType, fileSizeBytes, module, resourceType, and resourceId are required.',
      )
    }

    const fileType = validateFile(input.fileName, input.fileSizeBytes)

    const fileRef = db.collection(COLLECTIONS.FILES).doc()
    await fileRef.set({
      fileName: input.fileName.replace(/[^a-zA-Z0-9.\-_ ]/g, '_'),
      originalName: input.fileName,
      fileType,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      storagePath: input.storagePath,
      module: input.module,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      version: 1,
      fileStatus: 'available',
      ...newDocumentBaseFields(user.uid),
    })

    await recordAuditEvent({
      eventType: 'FileUploaded',
      category: 'Files',
      module: input.module,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: 'upload',
      user,
      metadata: { fileId: fileRef.id, fileName: input.fileName, fileSizeBytes: input.fileSizeBytes },
    })

    return successResponse({ fileId: fileRef.id }, 'File uploaded.')
  } catch (error) {
    handleError(error)
  }
})
