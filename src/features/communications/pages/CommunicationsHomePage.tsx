import { useNavigate } from 'react-router-dom'
import { Megaphone, ListChecks } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * The Communications hub — communications.md §4. Two sub-modules ship today.
 * Team Chat, Direct Messages, Activity Feed, Mentions and Communication
 * Settings are not built; the Notification Center is the bell in the header
 * rather than a page of its own.
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
