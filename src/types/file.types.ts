import type { BaseDocument } from './firestore.types'
import type { SupportedFileType, FileStatus } from '@/constants/statuses'

/**
 * Source: FILE_STORAGE.md §7. Business modules store only a fileId
 * reference (per §15) — never the file details inline on their own docs.
 */
export interface FileMetadata extends BaseDocument {
  fileName: string
  originalName: string
  fileType: SupportedFileType
  mimeType: string
  fileSizeBytes: number
  storagePath: string
  downloadUrl?: string
  module: string
  resourceType: string
  resourceId: string
  version: number
  fileStatus: FileStatus
}
