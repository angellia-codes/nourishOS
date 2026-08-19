import { useEffect, useRef, useState } from 'react'
import { Textarea } from '@/components/ui'
import { userService } from '@/services/shared'
import type { DirectoryUser } from '@/services/shared/userService'
import { cn } from '@/lib/utils'

interface MentionAutocompleteProps {
  value: string
  onValueChange: (value: string) => void
  mentionedUids: string[]
  onMentionedUidsChange: (uids: string[]) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
}

const MENTION_TOKEN = /(?:^|\s)@([a-zA-Z0-9._' -]{0,40})$/

/**
 * Shared between the Team Chat composer and the Task comment composer
 * (communications.md §11 — @User mentions; @Department/@Role are deferred).
 * There is no Dialog/modal component in this codebase, so the suggestion
 * list is a plain absolutely-positioned <div> under the textarea, not a
 * portal — matching every other "picker" surface here (multi-step flows are
 * separate routed pages, not modals).
 *
 * ponytail: mentionedUids is only updated when a suggestion is picked — if
 * the user later deletes the "@Name" text by hand, the uid isn't retroactively
 * removed. Fine for v1 (an extra notification to someone no longer named in
 * the visible text is a minor imprecision, not a correctness bug); revisit if
 * it turns out to matter.
 */
export function MentionAutocomplete({
  value,
  onValueChange,
  mentionedUids,
  onMentionedUidsChange,
  placeholder,
  rows = 3,
  maxLength,
  className,
}: MentionAutocompleteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [directory, setDirectory] = useState<DirectoryUser[]>([])
  const [query, setQuery] = useState<string | null>(null)

  useEffect(() => userService.subscribeToDirectory(setDirectory, () => setDirectory([])), [])

  const matches =
    query === null
      ? []
      : directory.filter((entry) => entry.displayName.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  function detectQuery(text: string, cursor: number) {
    const match = MENTION_TOKEN.exec(text.slice(0, cursor))
    setQuery(match ? match[1] : null)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onValueChange(e.target.value)
    detectQuery(e.target.value, e.target.selectionStart)
  }

  function pick(entry: DirectoryUser) {
    const textarea = textareaRef.current
    const cursor = textarea?.selectionStart ?? value.length
    const before = value.slice(0, cursor)
    const after = value.slice(cursor)
    const replaced = before.replace(MENTION_TOKEN, (whole) => `${whole.startsWith(' ') ? ' ' : ''}@${entry.displayName} `)
    onValueChange(replaced + after)
    if (!mentionedUids.includes(entry.uid)) {
      onMentionedUidsChange([...mentionedUids, entry.uid])
    }
    setQuery(null)
    requestAnimationFrame(() => textarea?.focus())
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
        onChange={handleChange}
        onKeyUp={(e) => detectQuery(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {query !== null && matches.length > 0 && (
        <div
          className={cn(
            'absolute left-0 top-full z-20 mt-1 w-64 max-w-full rounded-md border border-border bg-surface shadow-dialog',
          )}
        >
          {matches.map((entry) => (
            <button
              key={entry.uid}
              type="button"
              className="block w-full truncate px-3 py-2 text-left text-sm text-foreground hover:bg-border/30"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(entry)}
            >
              {entry.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
