import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { useAuth } from '@/hooks'

export function DashboardPage() {
  const { profile } = useAuth()
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">Good day, {firstName}</h1>
        <p className="text-sm text-muted-foreground">{profile?.roleId}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard widgets coming soon</CardTitle>
          <CardDescription>KPIs, pending approvals, and tasks land in a future milestone.</CardDescription>
        </CardHeader>
      </Card>

      <Link to="/demo/appraisal" className="text-sm font-medium text-primary hover:underline">
        Preview: Appraisal Review Form &rarr;
      </Link>
    </div>
  )
}
