import { useNavigate } from 'react-router-dom'
import { Card, CardContent, Button } from '@/components/ui'
import { ROUTES } from '@/constants'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Page Not Found</h1>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Button onClick={() => navigate(ROUTES.DASHBOARD)}>Back to Dashboard</Button>
      </CardContent>
    </Card>
  )
}
