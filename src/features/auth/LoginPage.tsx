import { useState } from 'react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks'

export function LoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleSignIn() {
    setError(null)
    setIsSigningIn(true)
    try {
      await signIn()
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
          <h1 className="font-display text-3xl text-primary">NourishOS</h1>
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
