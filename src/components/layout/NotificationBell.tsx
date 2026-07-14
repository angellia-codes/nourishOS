import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui'
import { NotificationPanel } from './NotificationPanel'
import { useAuth, useFirestoreQuery } from '@/hooks'
import { COLLECTIONS } from '@/constants'
import { where, orderBy, limit } from '@/services/firestore'
import type { AppNotification } from '@/types'

export function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const { data: notifications } = useFirestoreQuery<AppNotification>(
    COLLECTIONS.NOTIFICATIONS,
    user ? [where('recipientUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(20)] : [],
    [user?.uid],
  )

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <NotificationPanel notifications={notifications} />
        </>
      )}
    </div>
  )
}
