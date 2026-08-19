import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

/** Enter navigates to the results page — no live-as-you-type dropdown, so this is one query, not N per keystroke. */
export function SearchBar() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const q = value.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="hidden max-w-xs items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm md:flex">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search employees, SOPs, more…"
        aria-label="Search"
        className="w-full truncate bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  )
}
