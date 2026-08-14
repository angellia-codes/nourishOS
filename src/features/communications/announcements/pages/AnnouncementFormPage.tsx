import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { DEPARTMENTS, OUTLETS, ROLE_LABELS, PERMISSIONS } from '@/constants'
import { NOTIFICATION_PRIORITY, type NotificationPriority } from '@/constants/statuses'
import { useToast, usePermissions } from '@/hooks'
import * as announcementService from '../announcementService'
import { ANNOUNCEMENT_CATEGORY_LABELS } from '../announcementFormat'
import type { AnnouncementCategory } from '@/types'
import type { Role } from '@/constants/roles'

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [Role, string][]

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/** Checkbox is a bare native input, so the label wrapper lives here rather than four times below. */
function CheckOption({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <Checkbox checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}

/**
 * communications.md §5 — create and edit. Audience is three independent
 * dimensions and an empty selection on any of them means "everyone", which is
 * why the form says so out loud rather than leaving an empty checkbox group
 * looking like an unfinished field.
 *
 * Attachments (§12) are not here: createFileMetadata needs a resourceId, so
 * files are attached from the detail page once the draft exists.
 */
export function AnnouncementFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { announcementId } = useParams<{ announcementId: string }>()
  const { can } = usePermissions()
  const isEdit = Boolean(announcementId)

  const canPublish = can(PERMISSIONS.ANNOUNCEMENTS_PUBLISH)
  const canBroadcast = can(PERMISSIONS.ANNOUNCEMENTS_BROADCAST)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('general')
  const [priority, setPriority] = useState<NotificationPriority>(NOTIFICATION_PRIORITY.MEDIUM)
  const [isPinned, setIsPinned] = useState(false)
  const [outletIds, setOutletIds] = useState<string[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [roleIds, setRoleIds] = useState<Role[]>([])
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    if (!announcementId) return
    let cancelled = false

    void announcementService
      .getAnnouncement(announcementId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That announcement no longer exists.')
          navigate('/communications/announcements')
          return
        }
        setTitle(row.title)
        setBody(row.body)
        setCategory(row.category)
        setPriority(row.priority)
        setIsPinned(row.isPinned)
        setOutletIds(row.outletIds)
        setDepartmentIds(row.departmentIds)
        setRoleIds(row.roleIds)
        setIsPublished(row.announcementStatus === 'published')
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that announcement.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [announcementId, navigate, toast])

  const canSubmit = title.trim() !== '' && body.trim() !== '' && !submitting

  async function handleSubmit(publishNow: boolean) {
    setSubmitting(true)
    try {
      const input = { title: title.trim(), body: body.trim(), category, priority, isPinned, outletIds, departmentIds, roleIds }

      if (announcementId) {
        await announcementService.updateAnnouncement({ ...input, announcementId })
        if (publishNow) await announcementService.publishAnnouncement(announcementId)
        toast.success(publishNow ? 'Announcement published.' : 'Announcement updated.')
        navigate(`/communications/announcements/${announcementId}`)
        return
      }

      const { announcementId: newId } = await announcementService.createAnnouncement({ ...input, publishNow })
      toast.success(publishNow ? 'Announcement published.' : 'Draft saved.')
      navigate(`/communications/announcements/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the announcement.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        {isEdit ? 'Edit Announcement' : 'New Announcement'}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              rows={10}
              value={body}
              maxLength={8000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Plain text. Line breaks are kept as written."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
              >
                {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value} disabled={value === 'emergency' && !canBroadcast}>
                    {label}
                    {value === 'emergency' ? ' (Broadcast)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
              >
                {Object.values(NOTIFICATION_PRIORITY).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {category === 'emergency' && (
            <p className="flex items-start gap-2 rounded-md bg-status-rejected/10 p-3 text-sm text-status-rejected">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              This is a broadcast (communications.md §13). Everyone in the audience is notified immediately.
            </p>
          )}

          <CheckOption
            checked={isPinned}
            onChange={() => setIsPinned((pinned) => !pinned)}
            label="Pin to the top of the feed"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Leave a group empty to reach everyone in it. All three empty means company-wide.
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              Outlets {outletIds.length === 0 && <span className="text-muted-foreground">— all outlets</span>}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {OUTLETS.map((outlet) => (
                <CheckOption
                  key={outlet.id}
                  checked={outletIds.includes(outlet.id)}
                  onChange={() => setOutletIds((ids) => toggle(ids, outlet.id))}
                  label={outlet.name}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              Departments{' '}
              {departmentIds.length === 0 && <span className="text-muted-foreground">— all departments</span>}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEPARTMENTS.map((department) => (
                <CheckOption
                  key={department.id}
                  checked={departmentIds.includes(department.id)}
                  onChange={() => setDepartmentIds((ids) => toggle(ids, department.id))}
                  label={department.name}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              Roles {roleIds.length === 0 && <span className="text-muted-foreground">— all roles</span>}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map(([roleId, label]) => (
                <CheckOption
                  key={roleId}
                  checked={roleIds.includes(roleId)}
                  onChange={() => setRoleIds((ids) => toggle(ids, roleId))}
                  label={label}
                />
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        {!isPublished && (
          <Button variant="secondary" onClick={() => void handleSubmit(false)} disabled={!canSubmit}>
            Save draft
          </Button>
        )}
        {isPublished ? (
          <Button onClick={() => void handleSubmit(false)} disabled={!canSubmit}>
            Save changes
          </Button>
        ) : (
          canPublish && (
            <Button onClick={() => void handleSubmit(true)} disabled={!canSubmit}>
              Publish now
            </Button>
          )
        )}
      </div>
    </div>
  )
}
