import { useState } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/constants'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleSignIn() {
    setError(null)
    setIsSigningIn(true)
    try {
      await signIn()
      const from = (location.state as { from?: Location } | null)?.from
      navigate(from ? `${from.pathname}${from.search}` : ROUTES.DASHBOARD, { replace: true })
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">NourishOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">One Platform. Every Department. Every Outlet.</p>
        </div>

        <Button onClick={handleSignIn} loading={isSigningIn} className="w-full">
          Sign in with Google
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">Nourish Group Indonesia</p>
      </CardContent>
    </Card>
  )
}
