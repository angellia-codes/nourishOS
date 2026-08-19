import { Navigate, useLocation } from 'react-router-dom'
import { Card, CardContent, Button } from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/constants'

export function UnauthorizedPage() {
  const location = useLocation()
  const { signOut, status } = useAuth()
  const reason = (location.state as { reason?: string } | null)?.reason

  // This route is public, so unlike the protected pages nothing redirects
  // once signOut() clears the session — without this the Sign Out button
  // leaves the visitor sitting on the same screen.
  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

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
