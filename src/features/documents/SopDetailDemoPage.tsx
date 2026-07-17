import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, History } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { MOCK_SOP_DOCUMENTS, SOP_DEPARTMENTS } from './documentsDemoData'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_VARIANT, formatDocumentDate } from './documentsFormat'
import { useToast } from '@/hooks'

/**
 * Read-only visual preview of a single SOP document — documents.md §14
 * "Version Control" and §17 "Document Metadata". Mock data, no Firestore
 * reads, no backend calls. Download/Print are simulated with a toast.
 */
export function SopDetailDemoPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const doc = MOCK_SOP_DOCUMENTS.find((d) => d.id === documentId)

  if (!doc) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <EmptyState title="Document not found" description="This demo document does not exist." />
        </div>
      </div>
    )
  }

  const department = SOP_DEPARTMENTS.find((d) => d.id === doc.departmentId)?.name ?? doc.departmentId

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/documents')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{doc.title}</h1>
            <p className="text-sm text-muted-foreground">
              {doc.documentNumber} &middot; {doc.currentVersion} &middot; Owner {doc.owner}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => toast.success('Download started (demo) — no file was actually generated.')}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Download
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={DOCUMENT_STATUS_VARIANT[doc.status]}>{DOCUMENT_STATUS_LABELS[doc.status]}</Badge>
          {doc.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Department" value={department} />
            <Field label="Category" value={doc.category} />
            <Field label="Owner" value={doc.owner} />
            <Field label="Approver" value={doc.approver} />
            <Field label="Effective Date" value={formatDocumentDate(doc.effectiveDate)} />
            <Field label="Review Date" value={formatDocumentDate(doc.reviewDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {doc.versions.map((version) => (
                <li key={version.version} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {version.version} &middot; {version.author}
                    </p>
                    <p className="text-xs text-muted-foreground">{version.changeSummary}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDocumentDate(version.publishDate)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
