import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Plus } from 'lucide-react'
import { Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as documentResourceService from '../documentResourceService'
import type { DocumentResourceKind } from '../documentResourceService'
import type { DocumentResource } from '@/types'

interface ResourceListPageProps {
  kind: DocumentResourceKind
  title: string
  description: string
  basePath: string
}

/** Company Forms and Templates share this component — same shape, different kind/collection. See documentResourceService.ts. */
export function ResourceListPage({ kind, title, description, basePath }: ResourceListPageProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DocumentResource[] | null>(null)

  useEffect(() => {
    return documentResourceService.subscribeToDocumentResources(kind, setRows, () => setRows([]))
  }, [kind])

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.DOCUMENTS_PUBLISH}>
          <Button onClick={() => navigate(`${basePath}/new`)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </PermissionGuard>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing here yet" description="A super admin or HR manager hasn't added anything yet." />
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                {row.category && <p className="text-xs text-muted-foreground">{row.category}</p>}
                <p className="truncate font-medium text-foreground">{row.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={row.driveUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" type="button">
                    <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />
                    Open
                  </Button>
                </a>
                <PermissionGuard permission={PERMISSIONS.DOCUMENTS_PUBLISH}>
                  <Button variant="secondary" onClick={() => navigate(`${basePath}/${row.id}/edit`)}>
                    Edit
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
