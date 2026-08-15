import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { searchAll, type SearchResults } from '@/services/shared/searchService'

interface ResultRow {
  key: string
  label: string
  sublabel?: string
  to: string
}

/** FEATURE_SPECIFICATIONS.md's Shared Search Engine — five grouped sections, empty ones skipped. */
export function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [results, setResults] = useState<SearchResults | null>(null)

  useEffect(() => {
    let cancelled = false
    setResults(null)
    searchAll(q).then((next) => {
      if (!cancelled) setResults(next)
    })
    return () => {
      cancelled = true
    }
  }, [q])

  if (results === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const groups: { title: string; rows: ResultRow[] }[] = [
    {
      title: 'Employees',
      rows: results.employees.map((e) => ({ key: e.id, label: e.fullName, to: `/hr/employees/${e.id}` })),
    },
    {
      title: 'SOPs',
      rows: results.sops.map((s) => ({ key: s.id, label: s.topic, sublabel: s.sopNumber, to: '/documents/sop-library' })),
    },
    {
      title: 'Job Descriptions',
      rows: results.jobDescriptions.map((j) => ({ key: j.id, label: j.title, to: '/documents/job-descriptions' })),
    },
    {
      title: 'Announcements',
      rows: results.announcements.map((a) => ({ key: a.id, label: a.title, to: `/communications/announcements/${a.id}` })),
    },
    {
      title: 'Tasks',
      rows: results.tasks.map((t) => ({ key: t.id, label: t.title, to: `/communications/tasks/${t.id}` })),
    },
  ].filter((group) => group.rows.length > 0)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Search results</h1>
        <p className="text-sm text-muted-foreground">{q ? `Results for "${q}"` : 'Enter a search term.'}</p>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No results" description="Try a different search term, or check your spelling." />
      ) : (
        groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h2>
            {group.rows.map((row) => (
              <Card key={row.key}>
                <CardContent
                  className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-border/30"
                  onClick={() => navigate(row.to)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.label}</p>
                    {row.sublabel && <p className="font-mono text-xs text-muted-foreground">{row.sublabel}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
