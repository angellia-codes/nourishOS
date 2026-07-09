import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from 'firebase/storage'
import { storage } from '@/services/firebase'
import { callFunction } from '@/services/api'
import type { FileMetadata } from '@/types'

export interface UploadFileInput {
  file: File
  module: string
  resourceType: string
  resourceId: string
  onProgress?: (percent: number) => void
}

/** Per file_storage.md §6 folder structure: /{module}/{resourceType}/{resourceId}/{file}. */
function buildStoragePath(module: string, resourceType: string, resourceId: string, fileName: string): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  return `${module}/${resourceType}/${resourceId}/${timestamp}_${safeName}`
}

/**
 * Uploads the binary directly to Cloud Storage (client SDK, with progress —
 * file_storage.md §22), then asks a Cloud Function to validate it (size,
 * MIME type per §14) and write the Firestore metadata doc. If the metadata
 * call fails, the blob is orphaned in Storage — acceptable for now, cleanup
 * job is a Future Enhancement (§25), not blocking this milestone.
 */
export async function uploadFile(input: UploadFileInput): Promise<FileMetadata> {
  const { file, module, resourceType, resourceId, onProgress } = input
  const storagePath = buildStoragePath(module, resourceType, resourceId, file.name)
  const storageRef = ref(storage, storagePath)

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      reject,
      () => resolve(),
    )
  })

  return callFunction<FileMetadata>('createFileMetadata', {
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    module,
    resourceType,
    resourceId,
  })
}

export function getFileDownloadUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath))
}

/** Soft-deletes via Cloud Function (file_storage.md §8) — never deletes the Storage object from the client. */
export function deleteFile(fileId: string): Promise<void> {
  return callFunction('deleteFile', { fileId })
}
