import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Megaphone, Pin, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner, StatusPill, Tabs, TabPanel } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS, CROSS_OUTLET_ROLES } from '@/constants'
import { useAuth, usePermissions } from '@/hooks'
import { formatRelativeTime } from '@/utils'
import * as announcementService from '../announcementService'
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_STATUS_ICON,
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_STATUS_TONE,
  PRIORITY_VARIANT,
  sortForFeed,
} from '../announcementFormat'
import type { Announcement } from '@/types'

type TabValue = 'feed' | 'manage'

/**
 * communications.md §5. Two lists, because they are two different queries
 * against two different branches of the read rule: the feed is what was
 * published *to you* (`audienceUids array-contains me`), and Manage is what you
 * wrote (`createdBy == me`, or everything for an elevated role). Firestore fails
 * a whole list query if one returned document fails its rule, so they cannot be
 * merged into one broader query.
 */
export function AnnouncementListPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { can } = usePermissions()
  const uid = user?.uid ?? null

  const canManage = can(PERMISSIONS.ANNOUNCEMENTS_CREATE) || can(PERMISSIONS.ANNOUNCEMENTS_PUBLISH)
  const isElevated = profile ? (CROSS_OUTLET_ROLES as readonly string[]).includes(profile.roleId) : false

  const [tab, setTab] = useState<TabValue>('feed')
  const [feed, setFeed] = useState<Announcement[] | null>(null)
  const [managed, setManaged] = useState<Announcement[] | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [denied, setDenied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (!uid) return
    return announcementService.subscribeToMyFeed(
      uid,
      (next) => {
        setDenied(false)
        setFeed(next)
      },
      () => {
        setDenied(true)
        setFeed([])
      },
    )
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return announcementService.subscribeToMyReads(
      uid,
      (rows) => setReadIds(new Set(rows.map((row) => row.announcementId))),
      () => setReadIds(new Set()),
    )
  }, [uid])

  useEffect(() => {
    if (!uid || !canManage) return
    // An elevated role reads every announcement, so it can drop the createdBy
    // filter; anyone else must keep it or the query trips the read rule.
    return announcementService.subscribeToManagedAnnouncements(
      isElevated ? null : uid,
      setManaged,
      () => setManaged([]),
    )
  }, [uid, canManage, isElevated])

  const rows = tab === 'feed' ? feed : managed
  const visible = useMemo(() => {
    const filtered = (rows ?? []).filter((row) => categoryFilter === 'all' || row.category === categoryFilter)
    return tab === 'feed' ? sortForFeed(filtered) : filtered
  }, [rows, categoryFilter, tab])

  const unreadCount = (feed ?? []).filter((row) => !readIds.has(row.id)).length

  if (feed === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Announcements unavailable"
          description="Your account can't read the announcements register. Ask a super admin to check your role."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'Nothing unread'}
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.ANNOUNCEMENTS_CREATE}>
          <Button onClick={() => navigate('/communications/announcements/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Announcement
          </Button>
        </PermissionGuard>
      </div>

      {canManage && (
        <Tabs
          value={tab}
          onValueChange={(next) => setTab(next as TabValue)}
          items={[
            { value: 'feed', label: 'For me' },
            { value: 'manage', label: isElevated ? 'All announcements' : 'Mine' },
          ]}
        />
      )}

      <div className="sm:max-w-xs">
        <Select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <TabPanel value={tab} activeValue={tab}>
        {visible.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-8 w-8" aria-hidden="true" />}
            title={tab === 'feed' ? 'Nothing for you yet' : 'You have not written any yet'}
            description={
              tab === 'feed'
                ? 'Announcements published to your outlet, department or role land here.'
                : 'Drafts and published announcements you create will be listed here.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((row) => {
              const unread = tab === 'feed' && !readIds.has(row.id)
              return (
                <Card key={row.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/communications/announcements/${row.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                        )}
                        {row.isPinned && (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Pinned" />
                        )}
                        <p className={unread ? 'truncate font-semibold text-foreground' : 'truncate text-foreground'}>
                          {row.title}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ANNOUNCEMENT_CATEGORY_LABELS[row.category]} ·{' '}
                        {formatRelativeTime(row.publishedAt ?? row.createdAt)}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {row.priority !== 'medium' && (
                        <Badge variant={PRIORITY_VARIANT[row.priority]}>{row.priority}</Badge>
                      )}
                      {tab === 'manage' && (
                        <StatusPill
                          tone={ANNOUNCEMENT_STATUS_TONE[row.announcementStatus]}
                          icon={ANNOUNCEMENT_STATUS_ICON[row.announcementStatus]}
                          label={ANNOUNCEMENT_STATUS_LABELS[row.announcementStatus]}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
