import { CheckCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { notificationService } from '@/services/shared'
import { formatRelativeTime } from '@/utils'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types'

interface NotificationPanelProps {
  notifications: AppNotification[]
}

export function NotificationPanel({ notifications }: NotificationPanelProps) {
  async function handleMarkAllRead() {
    await notificationService.markAllNotificationsRead()
  }

  async function handleItemClick(notification: AppNotification) {
    if (!notification.isRead) {
      await notificationService.markNotificationRead(notification.id)
    }
  }

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-border bg-surface shadow-dialog">
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="text-sm font-semibold text-foreground">Notifications</p>
        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No notifications yet" />
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleItemClick(notification)}
              className={cn(
                'flex w-full flex-col gap-0.5 border-b border-border p-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-border/30',
                !notification.isRead && 'bg-primary/5',
              )}
            >
              <div className="flex items-center gap-2">
                {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                <p className="text-sm font-medium text-foreground">{notification.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{notification.message}</p>
              <p className="text-[11px] text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
