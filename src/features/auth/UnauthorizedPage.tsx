import { useLocation } from 'react-router-dom'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/hooks'

export function UnauthorizedPage() {
  const location = useLocation()
  const { signOut } = useAuth()
  const reason = (location.state as { reason?: string } | null)?.reason

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          {reason ?? 'You do not have permission to access this resource.'}
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign Out
        </Button>
      </CardContent>
    </Card>
  )
}
