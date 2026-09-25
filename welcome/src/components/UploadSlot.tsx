import { useRef, useState } from 'react'
import { Button, CheckIcon, Notice, Spinner } from '../ui'
import { STRINGS, t, type Lang } from '../strings'
import { prepareForUpload } from '../compress'
import { toBase64, uploadWelcomeDocument, type UploadSlot as Slot } from '../api'

/**
 * welcome-portal.md §6 — one upload slot.
 *
 * Camera and gallery are **separate controls**, not one "choose a file" button
 * that happens to offer both: a hire photographing their KTP on the spot and a
 * hire picking a scan someone emailed them are different intentions, and on
 * Android a single input with `capture` silently removes the gallery option.
 * Two inputs, one with `capture`, is the only way to offer both.
 *
 * §11 — "Per-file retry. Failed files never block already-uploaded ones." Each
 * slot owns its own error and its own retry; nothing here can wedge the step.
 */
export function UploadSlotField({
  slot,
  token,
  label,
  hint,
  lang,
  fileIds,
  onUploaded,
  onRemove,
  maxFiles = 1,
  imageOnly,
}: {
  slot: Slot
  token: string
  label: string
  hint: string
  lang: Lang
  fileIds: string[]
  onUploaded: (fileId: string) => void
  onRemove: (fileId: string) => void
  maxFiles?: number
  imageOnly?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const full = fileIds.length >= maxFiles

  async function handle(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      // Resize before measuring: an 8MB camera shot is usually well under the
      // limit once it has been through the canvas.
      const prepared = await prepareForUpload(file)
      if (prepared.blob.size > 8 * 1024 * 1024) {
        setError(t(STRINGS.fileTooBig, lang))
        return
      }
      const contentBase64 = await toBase64(prepared.blob)
      const result = await uploadWelcomeDocument({
        token,
        slot,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        contentBase64,
      })
      onUploaded(result.fileId)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setBusy(false)
      // Clear both inputs so picking the same file again still fires onChange.
      if (cameraRef.current) cameraRef.current.value = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  const accept = imageOnly ? 'image/*' : 'image/*,application/pdf'

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--w-glass-border)] bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--w-cream)]">{label}</p>
          <p className="text-xs text-[var(--w-cream-soft)]">{hint}</p>
        </div>
        {fileIds.length > 0 ? (
          <span className="flex flex-none items-center gap-1.5 text-xs font-semibold text-[var(--w-amber)]">
            {CheckIcon}
            {t(STRINGS.uploaded, lang)}
            {maxFiles > 1 ? ` ${fileIds.length}/${maxFiles}` : ''}
          </span>
        ) : null}
      </div>

      {fileIds.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {fileIds.map((fileId) => (
            <li key={fileId} className="flex items-center justify-between gap-2 text-sm text-[var(--w-cream-soft)]">
              {/* No filename is echoed back: the server stores a sanitised
                  name and the id is what the draft actually holds. */}
              <span className="w-mono truncate text-xs">{fileId.slice(0, 10)}…</span>
              <button
                type="button"
                className="w-focusable rounded px-2 py-1 text-xs font-semibold text-[var(--w-amber)] underline underline-offset-2"
                onClick={() => onRemove(fileId)}
              >
                {t(STRINGS.remove, lang)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {full ? null : (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => cameraRef.current?.click()}>
            {busy ? <Spinner /> : null}
            {busy ? t(STRINGS.uploading, lang) : t(STRINGS.takePhoto, lang)}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => galleryRef.current?.click()}>
            {t(STRINGS.chooseFile, lang)}
          </Button>
        </div>
      )}

      {/* `capture` is what makes the first button open the camera directly. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="w-sr-only"
        onChange={(event) => void handle(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        className="w-sr-only"
        onChange={(event) => void handle(event.target.files?.[0])}
      />
    </div>
  )
}
