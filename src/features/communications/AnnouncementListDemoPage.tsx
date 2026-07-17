import { useNavigate } from 'react-router-dom'
import { Megaphone, Pin, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { MOCK_ANNOUNCEMENTS } from './communicationsDemoData'
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_CATEGORY_VARIANT,
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_STATUS_VARIANT,
  formatAnnouncementDate,
} from './communicationsFormat'

/**
 * Read-only visual preview of the Announcements feed — communications.md §5
 * "Announcements" (audience, category, pin, workflow). Mock data, no
 * Firestore subscription, no backend calls.
 */
export function AnnouncementListDemoPage() {
  const navigate = useNavigate()
  const sorted = [...MOCK_ANNOUNCEMENTS].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. The real, auth-protected version will live at /communications.
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Announcements</h1>
            <p className="text-sm text-muted-foreground">Official company communications — communications.md §5.</p>
          </div>
          <Button onClick={() => navigate('/demo/communications/new')}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Announcement
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState title="No announcements yet" icon={<Megaphone className="h-8 w-8" aria-hidden="true" />} />
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((ann) => (
              <Card key={ann.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ann.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
                      <p className="font-medium text-foreground">{ann.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={ANNOUNCEMENT_CATEGORY_VARIANT[ann.category]}>{ANNOUNCEMENT_CATEGORY_LABELS[ann.category]}</Badge>
                      <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[ann.status]}>{ANNOUNCEMENT_STATUS_LABELS[ann.status]}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{ann.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {ann.authorName} &middot; {ANNOUNCEMENT_AUDIENCE_LABELS[ann.audience]} &middot;{' '}
                    {ann.publishedAt ? formatAnnouncementDate(ann.publishedAt) : `Created ${formatAnnouncementDate(ann.createdAt)}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
