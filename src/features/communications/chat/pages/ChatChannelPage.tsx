import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Hash, Send } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAuth, useFirestoreDoc, useToast } from '@/hooks'
import { userService } from '@/services/shared'
import { COLLECTIONS } from '@/constants'
import { formatRelativeTime } from '@/utils'
import { MentionAutocomplete } from '../components/MentionAutocomplete'
import * as chatService from '../chatService'
import type { ChatChannel, ChatMessage } from '@/types'

export function ChatChannelPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { channelId } = useParams<{ channelId: string }>()
  const { user } = useAuth()

  const { data: channel, loading } = useFirestoreDoc<ChatChannel>(COLLECTIONS.CHAT_CHANNELS, channelId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [mentionedUids, setMentionedUids] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!channelId) return
    return chatService.subscribeToMessages(channelId, setMessages, () => setMessages([]))
  }, [channelId])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function nameOf(uid: string): string {
    return names[uid] ?? uid
  }

  async function handleSend() {
    if (!channelId || draft.trim() === '') return
    setBusy(true)
    try {
      await chatService.sendMessage({ channelId, body: draft.trim(), mentionedUids })
      setDraft('')
      setMentionedUids([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!channel || !channelId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState title="Channel unavailable" description="You may not be a member of this channel." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col gap-3">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/communications')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Communications
      </Button>

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-semibold text-foreground">{channel.name}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={message.senderUid === user?.uid ? 'self-end text-right' : 'self-start'}>
              <p className="text-xs text-muted-foreground">
                {nameOf(message.senderUid)} · {formatRelativeTime(message.createdAt)}
              </p>
              <p className="mt-0.5 max-w-md whitespace-pre-wrap rounded-md border border-border bg-sunken px-3 py-2 text-sm text-foreground">
                {message.body}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <MentionAutocomplete
          value={draft}
          onValueChange={setDraft}
          mentionedUids={mentionedUids}
          onMentionedUidsChange={setMentionedUids}
          rows={2}
          maxLength={2000}
          placeholder="Message this channel — type @ to mention someone"
        />
        <Button className="self-end" disabled={busy || draft.trim() === ''} onClick={() => void handleSend()}>
          <Send className="mr-1 h-4 w-4" aria-hidden="true" />
          Send
        </Button>
      </div>
    </div>
  )
}
