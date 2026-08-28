import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pin, Send, Archive as ArchiveIcon, Pencil } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, FileList, FileUpload } from '@/components/shared'
import { COLLECTIONS, DEPARTMENTS, OUTLETS, ROLE_LABELS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import { useAuth, useFirestoreDoc, useFirestoreQuery, usePermissions, useToast } from '@/hooks'
import { formatDateTime } from '@/utils'
import * as announcementService from '../announcementService'
import { Confetti } from '../components/Confetti'
import { MilestoneWishes } from '../components/MilestoneWishes'
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  MILESTONE_LABELS,
  ANNOUNCEMENT_STATUS_ICON,
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_STATUS_TONE,
  PRIORITY_VARIANT,
  describeAudience,
} from '../announcementFormat'
import type { Announcement, FileMetadata } from '@/types'

const OUTLET_NAMES: Record<string, string> = Object.fromEntries(OUTLETS.map((o) => [o.id, o.name]))
const DEPARTMENT_NAMES: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]))

function labelFor(kind: 'outlet' | 'department' | 'role', id: string): string {
  if (kind === 'outlet') return OUTLET_NAMES[id] ?? id
  if (kind === 'department') return DEPARTMENT_NAMES[id] ?? id
  return ROLE_LABELS[id as keyof typeof ROLE_LABELS] ?? id
}

/**
 * communications.md §5. Opening the page records the read receipt (§5 read
 * tracking) — once per announcement, since the receipt doc id is
 * `${announcementId}_${uid}` and the callable is a set(merge).
 *
 * Attachments (§12) live here rather than on the form because createFileMetadata
 * needs an existing resourceId: the flow is create draft → attach → publish.
 */
export function AnnouncementDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { announcementId } = useParams<{ announcementId: string }>()
  const { user } = useAuth()
  const { can } = usePermissions()

  const { data: announcement, loading, error } = useFirestoreDoc<Announcement>(
    COLLECTIONS.ANNOUNCEMENTS,
    announcementId,
  )
  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    announcementId
      ? [
          where('resourceType', '==', 'announcement'),
          where('resourceId', '==', announcementId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [announcementId],
  )

  const [busy, setBusy] = useState(false)

  // Fire-and-forget: a failed receipt is not worth interrupting the read for.
  useEffect(() => {
    if (!announcementId || !announcement || announcement.announcementStatus !== 'published') return
    void announcementService.recordAnnouncementRead(announcementId).catch(() => undefined)
  }, [announcementId, announcement])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !announcement || !announcementId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Announcement unavailable"
          description="It may have been archived, or it was never published to you."
        />
      </div>
    )
  }

  const milestoneType = announcement.milestoneType ?? null
  const isAuthor = announcement.createdBy === user?.uid
  const canPublish = can(PERMISSIONS.ANNOUNCEMENTS_PUBLISH)
  const isDraft = announcement.announcementStatus === 'draft'
  const canEdit =
    announcement.announcementStatus !== 'archived' && (isAuthor || canPublish) && can(PERMISSIONS.ANNOUNCEMENTS_CREATE)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/communications/announcements')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Announcements
      </Button>

      <Card className={milestoneType ? 'relative overflow-hidden' : undefined}>
        {milestoneType && announcement.announcementStatus === 'published' && <Confetti />}
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {milestoneType && <Badge variant="success">{MILESTONE_LABELS[milestoneType]}</Badge>}
            <StatusPill
              tone={ANNOUNCEMENT_STATUS_TONE[announcement.announcementStatus]}
              icon={ANNOUNCEMENT_STATUS_ICON[announcement.announcementStatus]}
              label={ANNOUNCEMENT_STATUS_LABELS[announcement.announcementStatus]}
            />
            <Badge variant="neutral">{ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}</Badge>
            <Badge variant={PRIORITY_VARIANT[announcement.priority]}>{announcement.priority}</Badge>
            {announcement.isPinned && (
              <Pin className="h-4 w-4 text-muted-foreground" aria-label="Pinned" />
            )}
          </div>
          <CardTitle>{announcement.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {announcement.publishedAt
              ? `Published ${formatDateTime(announcement.publishedAt)}`
              : `Drafted ${formatDateTime(announcement.createdAt)}`}
            {announcement.announcementStatus === 'published' &&
              ` · ${announcement.audienceUids.length} recipient(s)`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">{announcement.body}</p>
          <p className="text-xs text-muted-foreground">{describeAudience(announcement, labelFor)}</p>
        </CardContent>
      </Card>

      {milestoneType && announcement.announcementStatus === 'published' && (
        <MilestoneWishes announcementId={announcementId} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {attachments.length === 0 && !canEdit ? (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          ) : (
            <FileList files={attachments} />
          )}
          {canEdit && (
            <FileUpload module="communications" resourceType="announcement" resourceId={announcementId} />
          )}
        </CardContent>
      </Card>

      {(canEdit || (canPublish && announcement.announcementStatus !== 'archived')) && (
        <div className="flex flex-wrap justify-end gap-2">
          {canEdit && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => navigate(`/communications/announcements/${announcementId}/edit`)}
            >
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}
          {isDraft && canPublish && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const { recipientCount } = await announcementService.publishAnnouncement(announcementId)
                  return recipientCount
                }, 'Announcement published.')
              }
            >
              <Send className="mr-1 h-4 w-4" aria-hidden="true" />
              Publish
            </Button>
          )}
          {!isDraft && canPublish && announcement.announcementStatus !== 'archived' && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await announcementService.archiveAnnouncement(announcementId)
                  navigate('/communications/announcements')
                }, 'Announcement archived.')
              }
            >
              <ArchiveIcon className="mr-1 h-4 w-4" aria-hidden="true" />
              Archive
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
