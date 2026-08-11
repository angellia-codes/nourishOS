import { callFunction } from '@/services/api'
import type { FileMetadata } from '@/types'

export interface UploadFileInput {
  file: File
  module: string
  resourceType: string
  resourceId: string
  onProgress?: (percent: number) => void
}

function fileToBase64(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'))
    reader.onload = () => {
      const result = reader.result as string
      // strip the "data:<mime>;base64," prefix — the backend only wants the payload
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads the file (as base64, apps-script/src/Files.js decodes it into
 * Drive) and writes its metadata row in one round trip — no separate
 * Storage-SDK step, no orphaned-blob-on-metadata-failure case to worry
 * about anymore (file_storage.md §22).
 */
export async function uploadFile(input: UploadFileInput): Promise<FileMetadata> {
  const { file, module, resourceType, resourceId, onProgress } = input
  const base64 = await fileToBase64(file, onProgress)

  return callFunction<FileMetadata>('files.upload', {
    base64,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    module,
    resourceType,
    resourceId,
  })
}

/** Soft-deletes via Apps Script action (file_storage.md §8) — never deletes the Drive file from the client. */
export function deleteFile(fileId: string): Promise<void> {
  return callFunction('files.delete', { fileId })
}
