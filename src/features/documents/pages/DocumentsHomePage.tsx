import { useNavigate } from 'react-router-dom'
import { BookText, FileText } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Documents hub — documents.md §4. Two sub-modules ship today; the rest of
 * §4's tree (templates, training materials, KPI) is still unbuilt.
 *
 * No permission gating here: each register enforces its own read access through
 * firestore.rules, so a card that leads to an access-restricted page is honest
 * about what exists rather than hiding the module entirely.
 */
const SUB_MODULES = [
  {
    to: '/documents/job-descriptions',
    icon: FileText,
    title: 'Job Descriptions',
    description: 'Job description PDFs by department and role.',
  },
  {
    to: '/documents/sop-library',
    icon: BookText,
    title: 'SOP Library',
    description: 'Approved standard operating procedures by department.',
  },
]

export function DocumentsHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">Company registers and reference documents.</p>
      </div>

      {SUB_MODULES.map(({ to, icon: Icon, title, description }) => (
        <Card key={to}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(to)}>
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
