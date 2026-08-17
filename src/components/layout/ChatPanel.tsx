import { useNavigate } from 'react-router-dom'
import { Hash, Plus } from 'lucide-react'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import type { ChatChannel } from '@/types'

interface ChatPanelProps {
  channels: ChatChannel[]
  onNavigate: () => void
}

/** Same dropdown shell as NotificationPanel — a channel picker, not an inline chat; opening a channel goes to its full page. */
export function ChatPanel({ channels, onNavigate }: ChatPanelProps) {
  const navigate = useNavigate()

  function goTo(path: string) {
    onNavigate()
    navigate(path)
  }

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-border bg-surface shadow-dialog">
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="text-sm font-semibold text-foreground">Team Chat</p>
        <PermissionGuard permission={PERMISSIONS.CHAT_MANAGE_CHANNELS}>
          <button
            type="button"
            onClick={() => goTo('/communications/chat/new')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Channel
          </button>
        </PermissionGuard>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {channels.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No channels yet" />
          </div>
        ) : (
          channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => goTo(`/communications/chat/${channel.id}`)}
              className="flex w-full items-center gap-2 border-b border-border p-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-border/30"
            >
              <Hash className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="truncate text-sm font-medium text-foreground">{channel.name}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
