import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { ApplyPage } from './pages/ApplyPage'
import { FormPage } from './pages/FormPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DiscPage } from './pages/DiscPage'
import { DonePage } from './pages/DonePage'
import { StatusPage } from './pages/StatusPage'

/**
 * Nourish Career Portal — candidate_portal.md §15's seven screens, one route
 * each. No auth guard anywhere: the application token in localStorage (or in
 * the ?t= link) is the only credential, and every route that needs one asks
 * the server rather than deciding locally.
 */
function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link to="/" className="text-lg font-semibold">
            Nourish Group Indonesia
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-muted-foreground">
        Your application is used only for recruitment at Nourish Group Indonesia.
      </footer>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/apply', element: <ApplyPage /> },
      { path: '/apply/form', element: <FormPage /> },
      { path: '/apply/documents', element: <DocumentsPage /> },
      { path: '/apply/disc', element: <DiscPage /> },
      { path: '/done', element: <DonePage /> },
      { path: '/status', element: <StatusPage /> },
      { path: '*', element: <LandingPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
