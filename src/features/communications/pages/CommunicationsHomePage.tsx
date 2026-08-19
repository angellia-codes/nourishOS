import { useNavigate } from 'react-router-dom'
import { Megaphone, ListChecks, MessageSquareWarning } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Communications hub — communications.md §4. Direct Messages and File
 * Sharing as its own surface are not built (not requested). Three
 * capabilities are deliberately not a page here, each with its own header/
 * dashboard entry point instead: the Notification Center (§9, the header
 * bell), the Activity Feed (§10, the dashboard's Team Activity widget), and
 * Team Chat's channel list (§7, the header's Team Chat button) — channel
 * conversations (`/communications/chat/:channelId`) and channel creation
 * (`/communications/chat/new`) still have real pages, reached from that
 * button, since a header dropdown can't host actual messaging. Communication
 * Settings (§14) moved to Settings (`/settings/communications`) since it's
 * account-level configuration, not a Communications record.
 *
 * No permission gating on the cards: each page enforces its own access through
 * firestore.rules, so a card that leads somewhere restricted is honest about
 * what exists rather than hiding the module.
 */
const SUB_MODULES = [
  {
    to: '/communications/announcements',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Company notices targeted by outlet, department and role.',
  },
  {
    to: '/communications/tasks',
    icon: ListChecks,
    title: 'Tasks',
    description: 'Work assigned to you, and what you have handed out.',
  },
  {
    to: '/communications/employee',
    icon: MessageSquareWarning,
    title: 'Employee Communication',
    description: 'Coaching, warnings and terminations — issued, signed and tracked.',
  },
]

export function CommunicationsHomePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Communications</h1>
        <p className="text-sm text-muted-foreground">Announcements and task assignments across the group.</p>
      </div>

      {SUB_MODULES.map(({ to, icon: Icon, title, description }) => (
        <Card key={to}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(to)}>
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
