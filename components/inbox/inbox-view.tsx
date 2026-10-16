'use client'

import { useState, useEffect, useLayoutEffect, useRef, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getConversations,
  getConversation,
  getConversationCount,
  getMessages,
  sendReply,
} from '@/lib/inbox'
import type { Conversation, Message, Cursor, Page } from '@/lib/inbox'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronLeft, Send, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatContact } from '@/lib/phone'
import { toast } from 'sonner'

// How close (px) to the end of a scrolled list counts as "reached it" and
// triggers loading the next page.
const LOAD_MORE_THRESHOLD_PX = 120

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div className={cn('rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center shrink-0', s)}>
      {getInitials(name)}
    </div>
  )
}

function ConversationItem({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  const displayName = conv.worker_name ?? formatContact(conv.phone)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatContact(conv.phone)}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {conv.unread && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

// Stable empty list, so a not-yet-loaded thread doesn't look like a change.
const NO_MESSAGES: Message[] = []

/** One open chat's loaded messages. `next` is the cursor for older ones. */
interface Thread {
  messages: Message[]
  next: Cursor | null
  loading: boolean
}

function MessageThread({
  conv, thread, onBack, onLoadOlder, onOptimisticSend, onOptimisticFail,
}: {
  conv: Conversation
  thread: Thread | undefined
  onBack: () => void
  onLoadOlder: () => void
  onOptimisticSend: (text: string) => string
  onOptimisticFail: (id: string) => void
}) {
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const messages = thread?.messages ?? NO_MESSAGES

  // Keep the view anchored as the message list changes: jump to the bottom on
  // first load and when a new message arrives, but when older messages are
  // prepended, offset by their height so what's on screen doesn't move.
  const prevFirstId = useRef<string | null>(null)
  const prevLastId = useRef<string | null>(null)
  const prevHeight = useRef(0)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const firstId = messages[0]?.id ?? null
    const lastId = messages.at(-1)?.id ?? null
    if (lastId !== prevLastId.current) {
      el.scrollTop = el.scrollHeight
    } else if (firstId !== prevFirstId.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current
    }
    prevFirstId.current = firstId
    prevLastId.current = lastId
    prevHeight.current = el.scrollHeight
  }, [messages])

  function handleScroll() {
    const el = scrollRef.current
    if (el && el.scrollTop < LOAD_MORE_THRESHOLD_PX && thread?.next && !thread.loading) {
      onLoadOlder()
    }
  }

  function handleSend() {
    const text = replyText.trim()
    if (!text) return
    setReplyText('')
    const optimisticId = onOptimisticSend(text)
    startTransition(async () => {
      const result = await sendReply(conv.id, text)
      if (result.error) {
        onOptimisticFail(optimisticId)
        toast.error(result.error)
      }
    })
  }

  const displayName = conv.worker_name ?? formatContact(conv.phone)

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 rounded-md hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar name={displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            {conv.worker_id && (
              <Link href={`/dashboard/workers/${conv.worker_id}`} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatContact(conv.phone)}</p>
        </div>
        {conv.worker_id && (
          <span className="shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-600/60 text-emerald-400">
            Available
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {thread?.loading && (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        )}
        {thread && !thread.next && !thread.loading && messages.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">Start of conversation</p>
        )}
        {messages.map((msg) => {
          const isOptimistic = msg.id.startsWith('optimistic-')
          const isFailed = msg.id.startsWith('failed-')
          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col',
                msg.direction === 'outbound' ? 'items-end' : 'items-start'
              )}
            >
              {msg.is_availability_message && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
                  <Check className="h-3 w-3" />
                  auto-parsed
                </span>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm',
                  msg.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                  isOptimistic && 'opacity-60',
                  isFailed && 'bg-destructive text-destructive-foreground'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body ?? ''}</p>
                <p className={cn(
                  'text-xs mt-1.5',
                  msg.direction === 'outbound' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
                  isFailed && 'text-destructive-foreground/70 text-right'
                )}>
                  {isFailed ? 'Failed to send' : isOptimistic ? 'Sending…' : formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply input */}
      <div className="shrink-0 border-t border-border px-4 pt-3 pb-2">
        <div className="flex gap-2 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a reply…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !replyText.trim()}
            size="icon"
            className="shrink-0 min-h-[44px] min-w-[44px] rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 mb-1">Enter to send &middot; Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// crypto.randomUUID() is only exposed in secure contexts (HTTPS or localhost),
// so it is undefined when the dev server is opened over a plain-HTTP LAN address
// -- e.g. testing on a phone. The value only has to be unique per mount, since
// it exists to keep Strict Mode's double-invocation from reusing a channel
// name, so a non-cryptographic fallback is equivalent here.
function uniqueChannelSuffix(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  )
}

/** Moves `conv` to the top of the list, replacing any older copy of it. */
function bringToTop(list: Conversation[], conv: Conversation): Conversation[] {
  return [conv, ...list.filter((c) => c.id !== conv.id)]
}

export function InboxView({
  initialPage,
  initialTotal,
}: {
  initialPage: Page<Conversation>
  initialTotal: number
}) {
  const [conversations, setConversations] = useState(initialPage.items)
  const [nextPage, setNextPage] = useState(initialPage.next)
  const [loadingPage, setLoadingPage] = useState(false)
  const [total, setTotal] = useState(initialTotal)
  const [selected, setSelected] = useState<string | null>(null)
  const [threads, setThreads] = useState<Record<string, Thread>>({})

  // The realtime handler needs the current list to decide whether a message
  // belongs to a conversation already shown; it can't read state directly.
  const conversationsRef = useRef(conversations)
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const selectedConv = conversations.find((c) => c.id === selected) ?? null

  const loadThread = useCallback(async (id: string, cursor?: Cursor) => {
    setThreads((prev) => ({
      ...prev,
      [id]: { messages: prev[id]?.messages ?? [], next: prev[id]?.next ?? null, loading: true },
    }))
    try {
      const page = await getMessages(id, cursor)
      setThreads((prev) => {
        const loaded = prev[id]?.messages ?? []
        const known = new Set(loaded.map((m) => m.id))
        const older = page.items.filter((m) => !known.has(m.id))
        return { ...prev, [id]: { messages: [...older, ...loaded], next: page.next, loading: false } }
      })
    } catch {
      toast.error('Could not load messages')
      setThreads((prev) => ({ ...prev, [id]: { ...prev[id], loading: false } }))
    }
  }, [])

  function selectConversation(id: string) {
    setSelected(id)
    if (!threads[id]) loadThread(id)
  }

  async function loadMoreConversations() {
    if (!nextPage || loadingPage) return
    setLoadingPage(true)
    try {
      const page = await getConversations(nextPage)
      setConversations((prev) => {
        const known = new Set(prev.map((c) => c.id))
        return [...prev, ...page.items.filter((c) => !known.has(c.id))]
      })
      setNextPage(page.next)
    } catch {
      toast.error('Could not load more conversations')
    } finally {
      setLoadingPage(false)
    }
  }

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD_PX) {
      loadMoreConversations()
    }
  }

  function handleOptimisticSend(text: string): string {
    const id = `optimistic-${Date.now()}`
    if (!selected) return id
    const optimistic: Message = {
      id,
      conversation_id: selected,
      direction: 'outbound',
      body: text,
      created_at: new Date().toISOString(),
      is_availability_message: false,
    }
    setThreads((prev) => {
      const t = prev[selected]
      if (!t) return prev
      return { ...prev, [selected]: { ...t, messages: [...t.messages, optimistic] } }
    })
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === selected)
      return conv
        ? bringToTop(prev, { ...conv, last_message: text, last_message_at: optimistic.created_at })
        : prev
    })
    return id
  }

  function handleOptimisticFail(id: string) {
    setThreads((prev) => {
      const out: Record<string, Thread> = {}
      for (const [k, t] of Object.entries(prev)) {
        out[k] = {
          ...t,
          messages: t.messages.map((m) => (m.id === id ? { ...m, id: `failed-${Date.now()}` } : m)),
        }
      }
      return out
    })
  }

  // Realtime — listen for new rows in `messages`. The database trigger has
  // already attached each row to its conversation, so `conversation_id` is set.
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`inbox-messages-${uniqueChannelSuffix()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new as Message & { worker_id: string | null }
          const msg: Message = {
            id: row.id,
            conversation_id: row.conversation_id,
            direction: row.direction,
            body: row.body,
            is_availability_message: row.is_availability_message,
            created_at: row.created_at,
          }

          // If that chat is loaded, append — replacing our own optimistic copy.
          setThreads((prev) => {
            const t = prev[msg.conversation_id]
            if (!t || t.messages.some((m) => m.id === msg.id)) return prev
            const withoutEcho = t.messages.filter(
              (m) => !(m.id.startsWith('optimistic-') && m.body === msg.body && m.direction === msg.direction)
            )
            return { ...prev, [msg.conversation_id]: { ...t, messages: [...withoutEcho, msg] } }
          })

          const existing = conversationsRef.current.find((c) => c.id === msg.conversation_id)
          // Unknown conversation (a new contact, or one beyond the loaded
          // pages), or a worker who just registered: fetch the row so the name
          // and preview are right.
          if (!existing || (row.worker_id && !existing.worker_name)) {
            const [conv, count] = await Promise.all([
              getConversation(msg.conversation_id),
              getConversationCount(),
            ])
            if (conv) setConversations((prev) => bringToTop(prev, conv))
            setTotal(count)
            return
          }

          setConversations((prev) => {
            const conv = prev.find((c) => c.id === msg.conversation_id)
            if (!conv) return prev
            return bringToTop(prev, {
              ...conv,
              last_message: msg.body,
              last_message_at: msg.created_at,
              last_inbound_at: msg.direction === 'inbound' ? msg.created_at : conv.last_inbound_at,
              unread: conv.unread || msg.direction === 'inbound',
            })
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (total === 0 && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center p-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Messages from workers will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh overflow-hidden">
      {/* Conversation list */}
      <div
        onScroll={handleListScroll}
        className={cn(
          'w-full md:w-80 md:border-r md:border-border flex-col overflow-y-auto shrink-0',
          selected ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} conversation{total !== 1 ? 's' : ''}</p>
        </div>
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            active={conv.id === selected}
            onClick={() => selectConversation(conv.id)}
          />
        ))}
        {loadingPage && (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
        )}
      </div>

      {/* Thread view */}
      <div className={cn(
        'flex-1 flex-col min-h-0',
        selected ? 'flex' : 'hidden md:flex'
      )}>
        {selectedConv ? (
          <MessageThread
            key={selectedConv.id}
            conv={selectedConv}
            thread={threads[selectedConv.id]}
            onBack={() => setSelected(null)}
            onLoadOlder={() => {
              const t = threads[selectedConv.id]
              if (t?.next) loadThread(selectedConv.id, t.next)
            }}
            onOptimisticSend={handleOptimisticSend}
            onOptimisticFail={handleOptimisticFail}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}
