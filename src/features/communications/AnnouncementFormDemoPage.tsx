import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import {
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_CATEGORY_OPTIONS,
  type AnnouncementAudience,
  type AnnouncementCategory,
} from './communicationsDemoData'
import { ANNOUNCEMENT_AUDIENCE_LABELS, ANNOUNCEMENT_CATEGORY_LABELS } from './communicationsFormat'

/**
 * Read-only-except-for-the-form visual preview of the Announcement
 * composition form — communications.md §5 "Announcements" (category,
 * audience, draft/publish). Mock data, no Firestore/Cloud Function calls.
 */
export function AnnouncementFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('general')
  const [audience, setAudience] = useState<AnnouncementAudience>('company_wide')

  const isValid = title.trim().length > 0 && body.trim().length > 0

  function handlePublish() {
    if (!isValid) return
    toast.success('Announcement published (demo) — audience notified server-side in the real flow; nothing was written to a backend.')
    navigate('/demo/communications')
  }

  function handleSaveDraft() {
    if (!isValid) return
    toast.success('Announcement saved as draft (demo) — nothing was written to a backend.')
    navigate('/demo/communications')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Publishing/saving shows a toast and returns to the list; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/communications')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New Announcement</h1>
            <p className="text-sm text-muted-foreground">Draft → Review (optional) → Publish → Notify Audience</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Content *</Label>
              <Textarea id="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
                  {ANNOUNCEMENT_CATEGORY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audience">Audience *</Label>
                <Select id="audience" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
                  {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {ANNOUNCEMENT_AUDIENCE_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/communications')}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" disabled={!isValid} onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button type="button" disabled={!isValid} onClick={handlePublish}>
            Publish
          </Button>
        </div>
      </div>
    </div>
  )
}
