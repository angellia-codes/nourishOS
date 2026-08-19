import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, Checkbox, Label, Spinner, Switch } from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
import * as communicationSettingsService from '../communicationSettingsService'
import * as chatService from '@/features/communications/chat/chatService'
import type { ChatChannel } from '@/types'

/**
 * communications.md §14. v1 enforcement is UI-only: muting a channel dims/
 * hides it in the Team Chat list client-side. There is no server-side
 * notification suppression yet — email/push/WhatsApp delivery (also §14
 * Future) would be where that eventually lands.
 */
export function CommunicationSettingsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, profile } = useAuth()

  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [mutedChannelIds, setMutedChannelIds] = useState<string[]>([])
  const [notifyOnMention, setNotifyOnMention] = useState(true)
  const [notifyOnTaskAssigned, setNotifyOnTaskAssigned] = useState(true)
  const [notifyOnAnnouncement, setNotifyOnAnnouncement] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubs = [
      chatService.subscribeToCompanyChannels((rows) => setChannels((prev) => mergeChannels(prev, 'company', rows))),
      profile?.departmentId
        ? chatService.subscribeToDepartmentChannels(profile.departmentId, (rows) =>
            setChannels((prev) => mergeChannels(prev, 'department', rows)),
          )
        : undefined,
      profile?.outletId
        ? chatService.subscribeToOutletChannels(profile.outletId, (rows) =>
            setChannels((prev) => mergeChannels(prev, 'outlet', rows)),
          )
        : undefined,
    ]
    return () => unsubs.forEach((u) => u?.())
  }, [profile?.departmentId, profile?.outletId])

  useEffect(() => {
    if (!user) return
    return communicationSettingsService.subscribeToMySettings(user.uid, (settings) => {
      setMutedChannelIds(settings?.mutedChannelIds ?? [])
      setNotifyOnMention(settings?.notifyOnMention ?? true)
      setNotifyOnTaskAssigned(settings?.notifyOnTaskAssigned ?? true)
      setNotifyOnAnnouncement(settings?.notifyOnAnnouncement ?? true)
      setLoaded(true)
    })
  }, [user])

  function toggleMuted(channelId: string) {
    setMutedChannelIds((prev) => (prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]))
  }

  async function handleSave() {
    setBusy(true)
    try {
      await communicationSettingsService.updateCommunicationSettings({
        mutedChannelIds,
        notifyOnMention,
        notifyOnTaskAssigned,
        notifyOnAnnouncement,
      })
      toast.success('Settings saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/settings')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Settings
      </Button>

      <h1 className="text-xl font-semibold text-foreground">Communication Settings</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <p className="text-sm font-medium text-foreground">Notify me when</p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="notify-mention">Someone @mentions me</Label>
            <Switch id="notify-mention" checked={notifyOnMention} onChange={(e) => setNotifyOnMention(e.target.checked)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="notify-task">I'm assigned a task</Label>
            <Switch
              id="notify-task"
              checked={notifyOnTaskAssigned}
              onChange={(e) => setNotifyOnTaskAssigned(e.target.checked)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="notify-announcement">A new announcement is published</Label>
            <Switch
              id="notify-announcement"
              checked={notifyOnAnnouncement}
              onChange={(e) => setNotifyOnAnnouncement(e.target.checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <p className="text-sm font-medium text-foreground">Muted channels</p>
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channels yet.</p>
          ) : (
            channels.map((channel) => (
              <label key={channel.id} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={mutedChannelIds.includes(channel.id)} onChange={() => toggleMuted(channel.id)} />
                {channel.name}
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Button className="self-end" disabled={busy} onClick={() => void handleSave()}>
        Save Settings
      </Button>
    </div>
  )
}

function mergeChannels(prev: ChatChannel[], scope: ChatChannel['scopeType'], rows: ChatChannel[]): ChatChannel[] {
  const others = prev.filter((c) => c.scopeType !== scope)
  return [...others, ...rows]
}
