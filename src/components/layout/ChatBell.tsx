import { useEffect, useState } from 'react'
import { Hash } from 'lucide-react'
import { Button } from '@/components/ui'
import { ChatPanel } from './ChatPanel'
import { useAuth } from '@/hooks'
import * as chatService from '@/features/communications/chat/chatService'
import type { ChatChannel } from '@/types'

/**
 * Header entry point for Team Chat, same toggle shape as NotificationBell —
 * icon button, click opens an anchored panel, a full-page overlay button
 * closes it on outside click. No unread badge: chat has no per-channel
 * read-state tracking yet (only communicationSettings.mutedChannelIds, which
 * is mute, not read/unread), so a count here would just be wrong.
 */
export function ChatBell() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState<ChatChannel[]>([])
  const [department, setDepartment] = useState<ChatChannel[]>([])
  const [outlet, setOutlet] = useState<ChatChannel[]>([])

  useEffect(() => chatService.subscribeToCompanyChannels(setCompany, () => setCompany([])), [])

  useEffect(() => {
    if (!profile?.departmentId) return
    return chatService.subscribeToDepartmentChannels(profile.departmentId, setDepartment, () => setDepartment([]))
  }, [profile?.departmentId])

  useEffect(() => {
    if (!profile?.outletId) return
    return chatService.subscribeToOutletChannels(profile.outletId, setOutlet, () => setOutlet([]))
  }, [profile?.outletId])

  const channels = [...company, ...department, ...outlet].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Team Chat"
      >
        <Hash className="h-4 w-4" aria-hidden="true" />
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close Team Chat"
            onClick={() => setOpen(false)}
          />
          <ChatPanel channels={channels} onNavigate={() => setOpen(false)} />
        </>
      )}
    </div>
  )
}
