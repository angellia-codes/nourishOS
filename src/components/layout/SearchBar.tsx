import { Search } from 'lucide-react'

export function SearchBar() {
  return (
    <div
      className="hidden max-w-xs items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground md:flex"
      title="Global search will be available once more modules are indexed."
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">Search coming soon</span>
    </div>
  )
}
