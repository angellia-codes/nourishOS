import { Card } from '../ui'

/** candidate_portal.md §15 Screen 7. */
export function DonePage() {
  return (
    <Card className="flex flex-col gap-4 text-center">
      <p className="text-4xl" aria-hidden="true">
        ✓
      </p>
      <h1 className="text-xl font-semibold">Application submitted</h1>
      <p className="text-muted-foreground">
        Thank you. Your application is now with our HR team, and we will contact you on WhatsApp about the next step.
      </p>
    </Card>
  )
}
