/**
 * TEMPORARY placeholder for Milestone 1 verification only.
 *
 * From Milestone 4 onward, this file's job is ONLY to compose providers
 * and mount the router:
 *
 *   <ThemeProvider><AuthProvider><AppRouter /></AuthProvider></ThemeProvider>
 *
 * It should never contain feature UI, business logic, or Firestore calls.
 */
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-3xl text-primary">NourishOS</h1>
        <p className="mt-2 text-muted-foreground">
          Foundation tooling is wired up: Tailwind, design tokens, path
          aliases, and folder structure.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Next: Firebase config, types, and the shared services layer.
        </p>
      </div>
    </div>
  )
}

export default App
