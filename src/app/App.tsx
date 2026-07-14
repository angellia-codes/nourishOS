import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthProvider'
import { router } from '@/routes'

/**
 * App shell only — composes providers and mounts the router. No business
 * logic, no feature UI. This fulfils the placeholder comment left in
 * Milestone 1's temporary harness.
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
