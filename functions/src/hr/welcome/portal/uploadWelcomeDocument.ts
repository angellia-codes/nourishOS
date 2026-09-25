import { onCall } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { randomUUID } from 'node:crypto'
import { REGION, updatedFields, AppError, handleError, successResponse } from '../../../lib'
import { createFileMetadataInternal } from '../../../shared/fileStorage'
import { resolveWelcomeInviteForEdit, welcomeActor } from '../invite'
import { MAX_SUPPORTING_FILES } from '../whitelist'

/**
 * welcome-portal.md §6 — the hire's four upload slots.
 *
 * Confirmed deviation from the spec's `requestUploadUrl` → client PUT →
 * `finalizeUpload`: the file arrives base64 inside this callable instead.
 * A new hire has no Firebase Auth account, so `storage.rules` (auth-required)
 * cannot recognise them; a v4 signed URL would work but needs a Service
 * Account Token Creator IAM grant that this project does not have, and the
 * Storage emulator does not serve v4 signed URLs at all, which would leave the
 * upload leg untested by welcome-flow.mjs. This is exactly the shape
 * recruitment/portal/uploadCandidateDocument.ts already ships, for the same
 * reason, and §6's own 8MB ceiling fits inside the callable payload limit.
 *
 * The client compresses images to ~2000px before calling, so the ceiling is
 * generous in practice rather than tight.
 */

const SLOTS = ['photo', 'ktp', 'kk', 'supporting'] as const
type Slot = (typeof SLOTS)[number]

/** §6 — PDF, JPEG, PNG, HEIC/HEIF. `photo` is image-only. */
const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
}
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']

/** §6 — "Max 8 MB per file", checked on the decoded bytes, not the base64. */
const MAX_FILE_BYTES = 8 * 1024 * 1024

export const uploadWelcomeDocument = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>

    // Measure the body before anything else touches it — serialising an
    // oversized upload to reject it would allocate the megabytes this guard
    // exists to refuse. Same trick recruitment/portal/guard.ts uses.
    const base64 = typeof data.contentBase64 === 'string' ? data.contentBase64 : ''
    if (base64.length * 0.75 > MAX_FILE_BYTES) {
      throw new AppError('invalid-argument', 'That file is too large. Each file must be under 8MB.')
    }

    const { ref, invite, employeeId, employee } = await resolveWelcomeInviteForEdit(data.token)

    const slot = typeof data.slot === 'string' ? data.slot.trim() : ''
    if (!SLOTS.includes(slot as Slot)) {
      throw new AppError('invalid-argument', `slot must be one of: ${SLOTS.join(', ')}.`)
    }

    const mimeType = typeof data.mimeType === 'string' ? data.mimeType.trim().toLowerCase() : ''
    const extension = ALLOWED_MIME[mimeType]
    if (!extension) {
      throw new AppError('invalid-argument', 'Upload a PDF, JPG, PNG or HEIC file.')
    }
    if (slot === 'photo' && !IMAGE_MIME.includes(mimeType)) {
      throw new AppError('invalid-argument', 'Your photo must be an image, not a PDF.')
    }

    const fileName = typeof data.fileName === 'string' ? data.fileName.trim() : ''
    if (!fileName || fileName.length > 200) {
      throw new AppError('invalid-argument', 'File name is required and must be 200 characters or fewer.')
    }

    if (!base64) throw new AppError('invalid-argument', 'The file is empty.')
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length === 0) throw new AppError('invalid-argument', 'That file could not be read. Try again.')
    if (buffer.length > MAX_FILE_BYTES) {
      throw new AppError('invalid-argument', 'That file is too large. Each file must be under 8MB.')
    }

    const draft = (invite.draft ?? {}) as Record<string, unknown>
    const existingSupporting = Array.isArray(draft.supportingFileIds)
      ? (draft.supportingFileIds as string[])
      : []
    if (slot === 'supporting' && existingSupporting.length >= MAX_SUPPORTING_FILES) {
      throw new AppError(
        'failed-precondition',
        `You can attach at most ${MAX_SUPPORTING_FILES} supporting files. Remove one first.`,
      )
    }

    const actor = welcomeActor(employeeId, employee)
    // §6's path. A uuid rather than a timestamp so a retry after a flaky
    // connection never overwrites the file that actually landed.
    const storagePath = `onboarding/${employeeId}/${slot}/${randomUUID()}.${extension}`

    await getStorage().bucket().file(storagePath).save(buffer, { contentType: mimeType, resumable: false })

    // validateFile (extension + size) runs inside createFileMetadataInternal,
    // so an unsupported type fails after the upload — the orphan is harmless
    // and the alternative is a second copy of the allowlist here.
    const { fileId } = await createFileMetadataInternal(actor, {
      storagePath,
      fileName,
      mimeType,
      fileSizeBytes: buffer.length,
      module: 'hr',
      resourceType: `onboardingDocument:${slot}`,
      resourceId: employeeId,
    })

    // Record it on the draft immediately: §11 says a failed file must never
    // block the ones already uploaded, which is only true if each success is
    // durable on its own.
    const slotField = slot === 'ktp' ? 'ktpFileId' : slot === 'kk' ? 'kkFileId' : 'photoFileId'
    const patch =
      slot === 'supporting'
        ? { supportingFileIds: [...existingSupporting, fileId] }
        : { [slotField]: fileId }

    await ref.update({ draft: { ...draft, ...patch }, ...updatedFields(actor.uid) })

    return successResponse({ fileId, slot, fileName }, 'Uploaded.')
  } catch (error) {
    return handleError(error)
  }
})
