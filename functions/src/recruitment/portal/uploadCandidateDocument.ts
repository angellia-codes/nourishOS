import { onCall } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { REGION, AppError, handleError, successResponse } from '../../lib'
import { createFileMetadataInternal } from '../../shared/fileStorage'
import { portalText, requirePayloadUnderLimit } from './guard'
import { portalActor, resolveCandidateForEdit } from './token'

/**
 * candidate_portal.md §11/§27 — CV, certificates, portfolio.
 *
 * The file arrives base64 inside the callable rather than going straight to
 * Storage, because a candidate has no Firebase Auth account and `storage.rules`
 * has no way to recognise an application token. Uploading through here keeps
 * the token as the only credential and reuses the shipped `files` metadata
 * engine (and its extension/size validation) unchanged.
 *
 * ponytail: base64 caps a file at ~8MB of callable payload. If CVs or
 * portfolios outgrow that, swap this for a v4 signed PUT URL minted here —
 * the Firestore side stays identical.
 */

const DOCUMENT_TYPES = ['cv', 'certificate', 'portfolio', 'idCard', 'other'] as const
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']

export const uploadCandidateDocument = onCall({ region: REGION }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    requirePayloadUnderLimit(data)

    const { candidateId, candidate } = await resolveCandidateForEdit(data.applicationToken)

    const documentType = portalText(data.documentType, 'Document type', 40)
    if (!DOCUMENT_TYPES.includes(documentType as (typeof DOCUMENT_TYPES)[number])) {
      throw new AppError('invalid-argument', `Document type must be one of: ${DOCUMENT_TYPES.join(', ')}.`)
    }

    const fileName = portalText(data.fileName, 'File name', 200)
    const mimeType = portalText(data.mimeType, 'File type', 100)
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new AppError('invalid-argument', 'Upload a PDF, JPG or PNG.')
    }

    const base64 = typeof data.contentBase64 === 'string' ? data.contentBase64 : ''
    if (!base64) throw new AppError('invalid-argument', 'The file is empty.')
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length === 0) throw new AppError('invalid-argument', 'That file could not be read. Try again.')

    const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
    const safeName = `${documentType}-${Date.now()}.${extension}`
    const storagePath = `candidate-documents/${candidateId}/${safeName}`

    await getStorage()
      .bucket()
      .file(storagePath)
      .save(buffer, { contentType: mimeType, resumable: false })

    // validateFile (extension + size) runs inside createFileMetadataInternal,
    // so an unsupported type fails after the upload — the orphan is harmless
    // and the alternative is duplicating the allowlist here.
    const { fileId } = await createFileMetadataInternal(portalActor(candidateId, candidate), {
      storagePath,
      fileName,
      mimeType,
      fileSizeBytes: buffer.length,
      module: 'hr',
      resourceType: `candidateDocument:${documentType}`,
      resourceId: candidateId,
    })

    return successResponse({ fileId, documentType, fileName }, 'Uploaded.')
  } catch (error) {
    return handleError(error)
  }
})
