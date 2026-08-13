import { FileText, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { fileService } from '@/services/shared'
import { useToast } from '@/hooks'
import { formatDate } from '@/utils'
import type { FileMetadata } from '@/types'

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp'])

interface FileListProps {
  files: FileMetadata[]
  onDeleted?: (fileId: string) => void
}

export function FileList({ files, onDeleted }: FileListProps) {
  const toast = useToast()

  async function handleDelete(file: FileMetadata) {
    try {
      await fileService.deleteFile(file.id)
      onDeleted?.(file.id)
      toast.success(`${file.originalName} removed.`)
    } catch {
      toast.error('Failed to remove file.')
    }
  }

  async function handleOpen(file: FileMetadata) {
    try {
      const url = await fileService.getFileDownloadUrl(file.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Failed to open file.')
    }
  }

  if (files.length === 0) return null

  return (
    <ul className="flex flex-col gap-2">
      {files.map((file) => {
        const Icon = IMAGE_TYPES.has(file.fileType) ? ImageIcon : FileText
        return (
          <li key={file.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void handleOpen(file)}
              className="flex-1 truncate text-left text-foreground hover:underline"
            >
              {file.originalName}
            </button>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(file.createdAt)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => void handleDelete(file)}
              aria-label={`Remove ${file.originalName}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
