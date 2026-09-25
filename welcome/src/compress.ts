/**
 * welcome-portal.md §6 — "Images are compressed client-side to about 2000 px
 * before upload."
 *
 * This is what makes the base64-through-a-callable upload path comfortable:
 * a modern phone camera produces 4-8MB per shot, right at the 8MB ceiling,
 * and a KTP photographed at 2000px on the long edge is still far more legible
 * than it needs to be.
 *
 * Deliberately no dependency — `createImageBitmap` plus a canvas is native
 * everywhere this app runs, and an image library would be larger than the
 * whole bundle.
 */

const MAX_EDGE = 2000
const JPEG_QUALITY = 0.82

export interface PreparedFile {
  blob: Blob
  fileName: string
  mimeType: string
}

/**
 * Returns the file re-encoded as JPEG when it is a raster image that can be
 * decoded, and the original bytes otherwise.
 *
 * Two cases fall through untouched on purpose: a PDF (there is nothing to
 * resize), and a HEIC that the browser cannot decode — Chrome on Android
 * mostly cannot, so the original is uploaded and the server accepts it, which
 * is exactly why heic/heif were added to the shared file validator.
 */
export async function prepareForUpload(file: File): Promise<PreparedFile> {
  const original: PreparedFile = { blob: file, fileName: file.name, mimeType: file.type }

  if (!file.type.startsWith('image/')) return original
  if (typeof createImageBitmap !== 'function') return original

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Undecodable format (usually HEIC). Send it as-is.
    return original
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    // Already small enough and already a JPEG or PNG: re-encoding would only
    // lose quality for no gain.
    if (scale === 1 && (file.type === 'image/jpeg' || file.type === 'image/png') && file.size <= 2 * 1024 * 1024) {
      return original
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) return original
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) return original

    // If the round trip made it bigger — a small PNG screenshot can — keep the
    // original rather than uploading the worse of the two.
    if (blob.size >= file.size && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      return original
    }

    return { blob, fileName: replaceExtension(file.name, 'jpg'), mimeType: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

function replaceExtension(fileName: string, extension: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '')
  return `${stem || 'upload'}.${extension}`
}
