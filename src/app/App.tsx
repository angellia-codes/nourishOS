import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ErrorBoundary, Toaster } from '@/components/shared'
import { router } from '@/routes'

/**
 * App shell only — composes providers and mounts the router. No business
 * logic, no feature UI.
 *
 * ErrorBoundary wraps AuthProvider so a crash anywhere in auth wiring or
 * routing still gets a styled fallback instead of a blank white screen.
 * Toaster is a sibling to the router (not nested inside a route) so it
 * survives navigation.
 */
function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
