import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import { COLLECTIONS } from '@/constants'
import { where } from '@/services/firestore'
import { useAuth, useFirestoreQuery, useToast } from '@/hooks'
import { formatRelativeTime } from '@/utils'
import * as announcementService from '../announcementService'
import { WISH_EMOJI, WISH_MESSAGE_MAX } from '../announcementFormat'
import type { MilestoneWish } from '@/types'

interface MilestoneWishesProps {
  announcementId: string
}

/**
 * The interactive half of a milestone announcement — an emoji row and a
 * guestbook of wishes.
 *
 * There is one wish document per person, so the emoji row and the message box
 * write to the same record: tapping a different emoji swaps yours, and sending
 * a message keeps whichever emoji you already had. That is why the counts below
 * always sum to the number of people who have responded, and why nobody can
 * stack five reactions on one post.
 *
 * Ordered and tallied client-side rather than by the query — an equality filter
 * plus an orderBy on a different field would need a composite index, and this
 * is one post's worth of rows.
 */
export function MilestoneWishes({ announcementId }: MilestoneWishesProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: wishes } = useFirestoreQuery<MilestoneWish>(
    COLLECTIONS.ANNOUNCEMENT_WISHES,
    [where('announcementId', '==', announcementId)],
    [announcementId],
  )

  const ordered = useMemo(
    () => [...wishes].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [wishes],
  )
  const counts = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const wish of wishes) tally[wish.emoji] = (tally[wish.emoji] ?? 0) + 1
    return tally
  }, [wishes])

  const myWish = wishes.find((wish) => wish.uid === user?.uid)
  const withMessages = ordered.filter((wish) => wish.message)

  async function send(emoji: string, message: string) {
    setBusy(true)
    try {
      await announcementService.sendMilestoneWish({ announcementId, emoji, message })
      setDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That wish did not send.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wishes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {WISH_EMOJI.map((emoji) => {
            const mine = myWish?.emoji === emoji
            return (
              <button
                key={emoji}
                type="button"
                disabled={busy}
                onClick={() => void send(emoji, myWish?.message ?? '')}
                aria-pressed={mine}
                aria-label={`React with ${emoji}`}
                className={`flex h-11 min-w-[3.5rem] items-center justify-center gap-1.5 rounded-lg border px-3 text-lg transition-colors disabled:opacity-50 ${
                  mine ? 'border-primary bg-primary/10' : 'border-border bg-transparent hover:bg-muted'
                }`}
              >
                <span aria-hidden="true">{emoji}</span>
                {counts[emoji] ? (
                  <span className="text-sm font-medium text-muted-foreground">{counts[emoji]}</span>
                ) : null}
              </button>
            )
          })}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!draft.trim() || busy) return
            void send(myWish?.emoji ?? WISH_EMOJI[0], draft)
          }}
        >
          <Input
            value={draft}
            maxLength={WISH_MESSAGE_MAX}
            placeholder={myWish?.message ? 'Update your message…' : 'Leave a message…'}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            <Send className="mr-1 h-4 w-4" aria-hidden="true" />
            Send
          </Button>
        </form>

        {withMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — be the first.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {withMessages.map((wish) => (
              <li key={wish.id} className="flex items-start gap-3">
                <Avatar size="sm" name={wish.senderName} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{wish.senderName}</span>{' '}
                    <span aria-hidden="true">{wish.emoji}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{wish.message}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(wish.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
