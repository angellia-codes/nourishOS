import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { getFileDownloadUrl } from '@/services/shared/fileService'
import { useToast } from '@/hooks'
import type { FileMetadata } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  cv: 'CV',
  certificate: 'Certificate',
  portfolio: 'Portfolio',
  idCard: 'ID card',
  other: 'Other',
}

/**
 * candidate_portal.md §11 — the documents the candidate uploaded. Download
 * URLs are minted on click rather than up front: `getDownloadURL` is a network
 * call per file, and most of these are never opened.
 */
export function CandidateDocumentsPanel({ documents }: { documents: FileMetadata[] }) {
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleOpen(file: FileMetadata) {
    setBusyId(file.id)
    try {
      window.open(await getFileDownloadUrl(file.storagePath), '_blank', 'noopener')
    } catch {
      toast.error('Could not open that file.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0 text-sm">
        {documents.length === 0 ? (
          <p className="text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          documents.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[file.resourceType.replace('candidateDocument:', '')] ?? 'Document'} ·{' '}
                  {Math.max(1, Math.round(file.fileSizeBytes / 1024))} KB
                </p>
              </div>
              <Button variant="ghost" size="sm" loading={busyId === file.id} onClick={() => handleOpen(file)}>
                <Download className="mr-1 h-4 w-4" aria-hidden="true" />
                Open
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
