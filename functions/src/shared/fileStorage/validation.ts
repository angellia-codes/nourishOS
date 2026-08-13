import { AppError } from '../../lib'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const DOCUMENT_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv']

const MAX_SIZE_BYTES = {
  image: 10 * 1024 * 1024,
  document: 25 * 1024 * 1024,
} as const

/** Returns the validated lowercase extension (used as the stored fileType), or throws. */
export function validateFile(fileName: string, fileSizeBytes: number): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (IMAGE_EXTENSIONS.includes(extension)) {
    if (fileSizeBytes > MAX_SIZE_BYTES.image) {
      throw new AppError('invalid-argument', `Image files must be under ${MAX_SIZE_BYTES.image / 1024 / 1024}MB.`)
    }
    return extension
  }

  if (DOCUMENT_EXTENSIONS.includes(extension)) {
    if (fileSizeBytes > MAX_SIZE_BYTES.document) {
      throw new AppError(
        'invalid-argument',
        `Document files must be under ${MAX_SIZE_BYTES.document / 1024 / 1024}MB.`,
      )
    }
    return extension
  }

  throw new AppError('invalid-argument', `Unsupported file type: .${extension || 'unknown'}`)
}
