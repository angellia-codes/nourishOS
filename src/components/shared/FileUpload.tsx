import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fileService } from '@/services/shared'
import { useToast } from '@/hooks'
import type { FileMetadata } from '@/types'

interface FileUploadProps {
  module: string
  resourceType: string
  resourceId: string
  onUploaded?: (file: FileMetadata) => void
  accept?: string
}

interface InFlightUpload {
  id: string
  fileName: string
  progress: number
}

export function FileUpload({ module, resourceType, resourceId, onUploaded, accept }: FileUploadProps) {
  const [inFlight, setInFlight] = useState<InFlightUpload[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return

      for (const file of Array.from(fileList)) {
        const uploadId = crypto.randomUUID()
        setInFlight((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 0 }])

        try {
          const metadata = await fileService.uploadFile({
            file,
            module,
            resourceType,
            resourceId,
            onProgress: (percent) =>
              setInFlight((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: percent } : u))),
          })
          onUploaded?.(metadata)
          toast.success(`${file.name} uploaded.`)
        } catch {
          toast.error(`Failed to upload ${file.name}.`)
        } finally {
          setInFlight((prev) => prev.filter((u) => u.id !== uploadId))
        }
      }
    },
    [module, resourceType, resourceId, onUploaded, toast],
  )

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-150',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PPTX, JPG, PNG — up to 25MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {inFlight.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {inFlight.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              <span className="flex-1 truncate">{u.fileName}</span>
              <span className="text-xs text-muted-foreground">{u.progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
