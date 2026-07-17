import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Badge, Card, CardContent, Select } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { MOCK_SOP_DOCUMENTS, SOP_DEPARTMENTS } from './documentsDemoData'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_VARIANT, formatDocumentDate } from './documentsFormat'

function departmentName(departmentId: string): string {
  return SOP_DEPARTMENTS.find((d) => d.id === departmentId)?.name ?? departmentId
}

/**
 * Read-only visual preview of the SOP Library — documents.md §6 "SOP
 * Library" (browse by department, search, version history). Mock data, no
 * Firestore subscription, no backend calls.
 */
export function SopLibraryListDemoPage() {
  const navigate = useNavigate()
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const documents = MOCK_SOP_DOCUMENTS.filter((doc) => departmentFilter === 'all' || doc.departmentId === departmentFilter)

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /documents.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">SOP Library</h1>
            <p className="text-sm text-muted-foreground">Approved operational procedures — documents.md §6.</p>
          </div>
          <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-48">
            <option value="all">All Departments</option>
            {SOP_DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>

        {documents.length === 0 ? (
          <EmptyState title="No SOPs found" description="Try a different department filter." icon={<FileText className="h-8 w-8" aria-hidden="true" />} />
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
                onClick={() => navigate(`/demo/documents/${doc.id}`)}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {doc.title}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{doc.documentNumber}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {departmentName(doc.departmentId)} &middot; {doc.category} &middot; {doc.currentVersion} &middot; Effective{' '}
                        {formatDocumentDate(doc.effectiveDate)}
                      </p>
                    </div>
                    <Badge variant={DOCUMENT_STATUS_VARIANT[doc.status]}>{DOCUMENT_STATUS_LABELS[doc.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
