import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card, CardContent } from '@/components/ui'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors anywhere below it. Does NOT catch errors in
 * event handlers, async code, or Cloud Function calls — those flow
 * through useAsync's try/catch and get surfaced via toasts instead.
 *
 * Logs to console for now. This is the seam where a real error-reporting
 * service (Sentry, Crashlytics — ARCHITECTURE.md §16) plugs in later;
 * intentionally not building that integration speculatively.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Reloading usually fixes it.
              </p>
              <Button onClick={this.handleReload}>Reload</Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
